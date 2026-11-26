import { metamask } from '@bigmi/client'
import { ChainId, type SignPsbtParameters } from '@bigmi/core'
import { Psbt } from 'bitcoinjs-lib'

const bitcoinScopes = {
    [ChainId.BITCOIN_MAINNET]: 'bip122:000000000019d6689c085ae165831e93',
    [ChainId.BITCOIN_TESTNET]: 'bip122:000000000933ea01ad0ee984209779ba',
} as const

export function metamaskPreservingPsbt(
    parameters: Parameters<typeof metamask>[0] = {},
): ReturnType<typeof metamask> {
    const baseFactory = metamask(parameters)

    return ((config) => {
        const connector = baseFactory(config)
        return {
            ...connector,
            async getProvider() {
                const provider = await connector.getProvider.call(this)
                if (!provider) return undefined
                return {
                    request: async (request: { method: string; params?: unknown }) => {
                        if (request.method !== 'signPsbt') return provider.request(request)
                        const wallet = await connector.getInternalProvider()
                        const connectedAddresses = wallet?.accounts.map(account => account.address) ?? []
                        return signMetaMaskPsbt(parameters.chainId, request.params as SignPsbtParameters, connectedAddresses)
                    },
                }
            },
        }
    }) satisfies typeof baseFactory
}

export async function signMetaMaskPsbt(
    chainId: string | undefined,
    { psbt, inputsToSign }: SignPsbtParameters,
    connectedAddresses: readonly string[],
): Promise<string> {
    const scope = bitcoinScopes[chainId as keyof typeof bitcoinScopes]
    if (!scope) throw new Error('Unsupported MetaMask Bitcoin network')

    const [address, ...otherAddresses] = [...new Set(inputsToSign.map(input => input.address))]
    if (!address || otherAddresses.length > 0 || !connectedAddresses.includes(address)) {
        throw new Error('Bitcoin signing account does not match the connected MetaMask account')
    }

    const { getMultichainClient, getDefaultTransport } = await import('@metamask/multichain-api-client')
    const transport = getDefaultTransport()
    try {
        const result = await getMultichainClient({ transport }).invokeMethod({
            scope,
            request: {
                method: 'signPsbt',
                params: {
                    account: { address },
                    psbt: Psbt.fromHex(psbt).toBase64(),
                    options: { fill: false, broadcast: false },
                },
            },
        })
        return Psbt.fromBase64(result.psbt).toHex()
    } finally {
        await transport.disconnect().catch(() => {})
    }
}
