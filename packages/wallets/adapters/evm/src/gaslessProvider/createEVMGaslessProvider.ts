import { foregroundWalletApp } from "@layerswap/wallet-core";
import { Network } from "@layerswap/widget-types";
import { GaslessProvider, GaslessSignParams } from "@layerswap/widget-types";
import { getAccount, Config } from '@wagmi/core'

export function createEVMGaslessProvider(
    config: Config,
    supportsNetwork: (network: Network) => boolean
): GaslessProvider {
    return {
        supportsNetwork,

        async signGaslessDeposit({ address, typedData, wallet }: GaslessSignParams): Promise<string> {
            if (!typedData)
                throw new Error('Missing typed data for gasless deposit')
            if (!address)
                throw new Error('No selected account')

            const walletProvider = await getAccount(config).connector?.getProvider() as
                { request?: (args: { method: string; params: any[] }) => Promise<unknown> } | undefined
            if (!walletProvider?.request)
                throw new Error('Wallet provider unavailable')

            await foregroundWalletApp(wallet?.metadata?.deepLink)

            const signature = await walletProvider.request({
                method: 'eth_signTypedData_v4',
                params: [address, JSON.stringify(typedData)],
            })
            if (typeof signature !== 'string')
                throw new Error('Invalid signature returned by wallet')
            return signature
        }
    }
}
