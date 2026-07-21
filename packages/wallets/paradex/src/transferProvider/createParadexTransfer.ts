// Intentional dependency on @layerswap/wallet-evm's PUBLIC api. Paradex L1
// authorization needs a real ethers signer bound to the same wagmi config the
// EVM provider populated — something the abstract WalletConnectionProvider
// can't expose. wallet-evm is declared as a peerDependency precisely so this
// resolves to the single shared module instance (and thus the same
// `getEvmConfig()` singleton); do NOT make it a bundled dependency or the
// signer would bind to a different, empty config. Keep usage limited to these
// documented, package-root exports.
import { getEthersSigner, getEvmConfig } from '@layerswap/wallet-evm'
import { KnownInternalNames } from "@layerswap/utils";
import type { Network } from "@layerswap/utils"
import type { Wallet } from "@layerswap/wallet-core/types"
import { ActionMessageType, type TransferProvider, type TransferProps } from "@layerswap/wallet-core/types"
import { getChainId, switchChain } from '@wagmi/core'
import AuthorizeEthereum from '../Authorize/Ethereum'
import { AuthorizeStarknet } from '../Authorize/Starknet'

const supportedNetworks = [
    KnownInternalNames.Networks.ParadexMainnet,
    KnownInternalNames.Networks.ParadexTestnet,
]

const PARADEX_MAX_FEE = '1000000000000000'

async function resolveParadexAccount(wallet: Wallet) {
    if (wallet.metadata?.l1ProviderName === 'EVM') {
        const requiredChainId = wallet.metadata.l1ChainId
            ? Number(wallet.metadata.l1ChainId)
            : undefined

        if (requiredChainId) {
            const config = getEvmConfig()
            if (getChainId(config) !== requiredChainId) {
                await switchChain(config, { chainId: requiredChainId })
            }
        }

        const signer = await getEthersSigner({ chainId: requiredChainId })
        if (!signer) throw new Error('EVM wallet not connected')
        return AuthorizeEthereum(signer)
    }

    if (wallet.metadata?.l1ProviderName === 'Starknet') {
        const account = wallet.metadata.starknetAccount
        if (!account) throw new Error('Starknet account not found')
        return AuthorizeStarknet(account)
    }

    throw new Error('Paradex backing wallet not found')
}

export function createParadexTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return supportedNetworks.includes(network.name)
        },

        async executeTransfer(params: TransferProps, wallet?: Wallet): Promise<string> {
            const selectedWallet = wallet ?? params.selectedWallet
            if (!selectedWallet) throw new Error('No wallet selected')

            try {
                const client = await resolveParadexAccount(selectedWallet)
                const account = (client as any).account
                if (!account) throw new Error('Paradex account not found')

                const result = await account.execute(
                    JSON.parse(params.callData || ''),
                    { maxFee: PARADEX_MAX_FEE },
                )
                if (!result?.transaction_hash) {
                    throw new Error('No transaction hash returned')
                }
                return result.transaction_hash
            } catch (error: any) {
                const resolved = new Error(error?.message || String(error))
                resolved.name = error?.message?.toLowerCase().includes('reject')
                    ? ActionMessageType.TransactionRejected
                    : ActionMessageType.UnexpectedErrorMessage
                throw resolved
            }
        },
    }
}
