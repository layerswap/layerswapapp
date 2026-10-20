import type { Wallet } from '@layerswap/widget-types';
import { KnownInternalNames } from "@layerswap/utils";
import { Network } from "@layerswap/widget-types";
import { TransferProvider, TransferProps } from "@layerswap/widget-types";
import { toTransferError } from "./toTransferError"

const supportedNetworks = [
    KnownInternalNames.Networks.StarkNetMainnet,
    KnownInternalNames.Networks.StarkNetGoerli,
    KnownInternalNames.Networks.StarkNetSepolia
]

export function createStarknetTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return supportedNetworks.includes(network.name)
        },

        async executeTransfer(params: TransferProps, wallet?: Wallet): Promise<string> {
            const { callData } = params
            const selectedWallet = params.selectedWallet ?? wallet
            const account = wallet?.metadata?.starknetAccount
            let calls: Array<{ contractAddress: string; entrypoint: string; calldata: unknown[] }> = []

            try {
                if (!account || !selectedWallet) throw new Error("Starknet account not found in wallet metadata")
                if (wallet?.id !== selectedWallet.id || wallet?.providerName !== selectedWallet.providerName
                    || !sameAddress(wallet?.address, selectedWallet.address)) {
                    throw new Error('Selected Starknet wallet does not match the signing wallet. Reconnect your wallet.')
                }
                const prepared = JSON.parse(callData || "")
                calls = Array.isArray(prepared) ? prepared : [prepared]
                if (!calls.length || calls.some(call => !call || typeof call.contractAddress !== 'string'
                    || !call.contractAddress || typeof call.entrypoint !== 'string' || !call.entrypoint
                    || !Array.isArray(call.calldata))) {
                    throw new Error('Invalid Starknet transfer calls')
                }

                // WalletAccount follows extension account changes, but the selected UI
                // wallet may still describe the previous account. execute() itself does
                // not specify a sender, so verify the extension's active account too.
                const accounts = await account.requestAccounts(true)
                if (!accounts?.length) {
                    throw Object.assign(new Error('No authorized Starknet account is available. Unlock your wallet and reconnect before sending.'), { reasonCode: 'unauthorized' })
                }
                if (!sameAddress(accounts?.[0], selectedWallet.address)
                    || !sameAddress(account.address, selectedWallet.address)) {
                    throw new Error('Starknet account changed. Reconnect your wallet before sending.')
                }
                const { transaction_hash } = await account.execute(calls) || {}
                if (!transaction_hash) throw new Error("No transaction hash returned")
                return transaction_hash
            } catch (error) {
                const transferError = toTransferError(error)
                // Keep the original wallet exception intact. Summaries identify the
                // signer and prepared call targets without copying calldata/provider objects.
                transferError.cause = new Error(
                    `Starknet wallet ${selectedWallet?.id}; selected account ${selectedWallet?.address}; signing account ${account?.address}; calls ${calls.length}: `
                    + calls.slice(0, 16).map(call => `${call?.contractAddress}.${call?.entrypoint}`).join(', ').slice(0, 2000),
                    { cause: error },
                )
                throw transferError
            }
        }
    }
}

function sameAddress(left: unknown, right: unknown): boolean {
    if (typeof left !== 'string' || typeof right !== 'string' || !/^0x[0-9a-f]+$/i.test(left) || !/^0x[0-9a-f]+$/i.test(right)) return false
    return BigInt(left) === BigInt(right)
}
