
import { GasProps } from "../../../Models/Balance"
import { NetworkType, Network } from "../../../Models/Network"

export class EVMGasProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.EVM && !!network.token
    }

    getGas = async ({ network, token, address, isSweeplessTx, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe' }: GasProps) => {

        const chainId = Number(network?.chain_id)

        if (!network || !address || isSweeplessTx === undefined || !chainId || !recipientAddress) {
            return
        }

        const contract_address = token.contract as `0x${string}`

        try {

            const { createPublicClient, http } = await import("viem")
            const resolveNetworkChain = (await import("../../resolveChain")).default
            const publicClient = createPublicClient({
                chain: resolveNetworkChain(network),
                transport: http(),
            })

            const getEthereumGas = (await import("../../balances/evm/gas/ethereum")).default
            const getOptimismGas = (await import("../../balances/evm/gas/optimism")).default

            const getGas = network?.metadata?.evm_oracle_contract ? getOptimismGas : getEthereumGas

            const gasProvider = new getGas(
                {

                    publicClient,
                    chainId,
                    contract_address,
                    account: address,
                    from: network,
                    currency: token,
                    destination: recipientAddress as `0x${string}`,
                    nativeToken: token,
                    isSweeplessTx,
                }
            )

            const gas = await gasProvider.resolveGas()

            if (!gas) return

            return [gas]

        }
        catch (e) {
            console.log(e)
        }

    }
}