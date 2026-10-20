import { KnownInternalNames } from '@layerswap/utils'
import type { Network, TransferProvider, TransferProps } from '@layerswap/widget-types'
import type { Call, RawArgs } from 'starknet-rpc'
import { assertStarknetAccount, requireStarknetAccount, StarknetAccountError } from '../service/starknetAccount'
import { toTransferError } from './toTransferError'

const supportedNetworks = [
    KnownInternalNames.Networks.StarkNetMainnet,
    KnownInternalNames.Networks.StarkNetGoerli,
    KnownInternalNames.Networks.StarkNetSepolia,
]

/** Prepare the backend payload once; extensions receive compiled call arrays only. */
async function prepareCalls(callData: string | undefined): Promise<Call[]> {
    const prepared = JSON.parse(callData || '')
    const calls = Array.isArray(prepared) ? prepared : [prepared]
    if (!calls.length) throw new Error('Invalid Starknet transfer calls')
    const { CallData } = await import('starknet-rpc')
    return calls.map(call => {
        if (!call || typeof call.contractAddress !== 'string' || !call.contractAddress
            || typeof call.entrypoint !== 'string' || !call.entrypoint
            || (call.calldata !== undefined && (call.calldata === null || typeof call.calldata !== 'object'))) {
            throw new Error('Invalid Starknet transfer calls')
        }
        return {
            contractAddress: call.contractAddress,
            entrypoint: call.entrypoint,
            calldata: Array.isArray(call.calldata) ? call.calldata : CallData.compile((call.calldata ?? []) as RawArgs),
        }
    })
}

export function createStarknetTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return supportedNetworks.includes(network.name)
        },

        async executeTransfer(params: TransferProps, wallet): Promise<string> {
            // Selection owns both the expected account and its signing metadata.
            // The optional wallet argument is retained for legacy adapter callers.
            const selected = params.selectedWallet ?? wallet
            const account = selected?.metadata?.starknetAccount
            let calls: Call[] = []
            try {
                if (!account || !selected) throw new StarknetAccountError('Starknet account is unavailable. Reconnect your wallet before sending.')
                calls = await prepareCalls(params.callData)
                const active = requireStarknetAccount(await account.requestAccounts(true))
                assertStarknetAccount(active, selected.address)
                assertStarknetAccount(account.address, selected.address)
                const result = await account.execute(calls)
                if (!result?.transaction_hash) throw new Error('No transaction hash returned')
                return result.transaction_hash
            } catch (error) {
                const context = `Starknet wallet ${selected?.id}; selected account ${selected?.address}; signing account ${account?.address}; calls ${calls.length}: `
                    + calls.slice(0, 16).map(call => `${call.contractAddress}.${call.entrypoint}`).join(', ').slice(0, 2000)
                throw toTransferError(error, context)
            }
        },
    }
}
