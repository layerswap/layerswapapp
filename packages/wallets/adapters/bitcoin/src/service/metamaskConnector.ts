import { metamask } from '@bigmi/client'
import { ChainId, type SignPsbtParameters } from '@bigmi/core'
import type { MultichainApiClient, Transport } from '@metamask/multichain-api-client'
import { Psbt } from 'bitcoinjs-lib'

const bitcoinScopes = {
    [ChainId.BITCOIN_MAINNET]: 'bip122:000000000019d6689c085ae165831e93',
    [ChainId.BITCOIN_TESTNET]: 'bip122:000000000933ea01ad0ee984209779ba',
} as const

type SigningClient = Pick<MultichainApiClient, 'getSession' | 'invokeMethod'>

/** Keep Bigmi's discovery and connection lifecycle, replacing only PSBT signing. */
export function metamaskPreservingPsbt(
    parameters: Parameters<typeof metamask>[0] = {},
): ReturnType<typeof metamask> {
    const baseFactory = metamask(parameters)

    return ((config) => {
        const connector = baseFactory(config)
        let clientPromise: Promise<{
            client: MultichainApiClient
            transport: Transport
            TransportError: typeof import('@metamask/multichain-api-client').TransportError
        }> | undefined

        async function clearClient(current: typeof clientPromise) {
            if (!current || clientPromise !== current) return
            clientPromise = undefined
            const connection = await current.catch(() => undefined)
            await connection?.transport.disconnect().catch(() => {})
        }
        return {
            ...connector,
            async disconnect() {
                try {
                    await connector.disconnect.call(this)
                } finally {
                    await clearClient(clientPromise)
                }
            },
            async getProvider() {
                const wallet = await connector.getInternalProvider()
                if (!wallet) {
                    return undefined
                }

                const provider = await connector.getProvider.call(this)
                if (!provider) {
                    return undefined
                }

                return {
                    request: async (request: { method: string; params?: unknown }) => {
                        if (request.method !== 'signPsbt') {
                            return provider.request(request)
                        }

                        // Wallet Standard hardcodes fill:true. The public Multichain API
                        // exposes sign-only operation without rebuilding our transaction.
                        const current = clientPromise ??= import('@metamask/multichain-api-client').then(
                            ({ getMultichainClient, getDefaultTransport, TransportError }) => {
                                const transport = getDefaultTransport()
                                return { client: getMultichainClient({ transport }), transport, TransportError }
                            }
                        )
                        const connection = await current.catch(async error => {
                            await clearClient(current)
                            throw error
                        })
                        try {
                            return await signMetaMaskPsbt(
                                connection.client,
                                parameters.chainId,
                                wallet.accounts.map(account => account.address),
                                request.params as SignPsbtParameters,
                            )
                        } catch (error) {
                            // Retry only on a new user action, never replay a signing request.
                            if (error instanceof connection.TransportError || !connection.transport.isConnected()) {
                                await clearClient(current)
                            }
                            throw error
                        }
                    },
                }
            },
        }
    }) satisfies typeof baseFactory
}

export async function signMetaMaskPsbt(
    client: SigningClient,
    chainId: string | undefined,
    connectedAddresses: readonly string[],
    { psbt: psbtHex, inputsToSign }: SignPsbtParameters,
): Promise<string> {
    const scope = bitcoinScopes[chainId as keyof typeof bitcoinScopes]
    if (!scope) {
        throw new Error('Unsupported MetaMask Bitcoin network')
    }

    const addresses = [...new Set(inputsToSign.map(input => input.address))]
    const address = addresses[0]
    if (addresses.length !== 1 || !address || !connectedAddresses.includes(address)) {
        throw new Error('Bitcoin signing account does not match the connected MetaMask account')
    }

    const session = await client.getSession()
    const grantedScope = session?.sessionScopes[scope]
    if (!grantedScope?.accounts?.includes(`${scope}:${address}`)
        || !grantedScope.methods.includes('signPsbt')) {
        throw new Error('MetaMask Bitcoin signing permission is missing; reconnect the wallet')
    }

    const prepared = Psbt.fromHex(psbtHex)
    const result = await client.invokeMethod({
        scope,
        request: {
            method: 'signPsbt',
            params: {
                account: { address },
                psbt: prepared.toBase64(),
                options: { fill: false, broadcast: false },
            },
        },
    })

    const signed = Psbt.fromBase64(result.psbt)
    // Signing/finalization metadata may change; the unsigned transaction must not.
    const originalTransaction = prepared.data.globalMap.unsignedTx.toBuffer()
    const returnedTransaction = signed.data.globalMap.unsignedTx.toBuffer()
    if (!Buffer.from(originalTransaction).equals(Buffer.from(returnedTransaction))) {
        throw new Error('MetaMask changed the prepared Bitcoin transaction')
    }
    return signed.toHex()
}
