import { TransferProps } from "@layerswap/widget/types"
import { parseEther } from "viem"
import { EVMGasProvider } from "../gasProviders"

export const transactionBuilder = async (params: TransferProps) => {
    const { amount, callData, depositAddress, network, selectedWallet, token } = params


    const tx = {
        chainId: Number(network?.chain_id),
        to: depositAddress as `0x${string}`,
        value: parseEther(amount.toString()),
        gas: undefined as any,
        data: callData as `0x${string}`,
        account: selectedWallet.address as `0x${string}`
    }

    try {
        const gasData = await new EVMGasProvider().getGas({
            address: selectedWallet.address,
            network,
            token
        })

        if (gasData?.gas) tx.gas = BigInt(gasData.gas)

    } catch (error) {
        console.log(error)
    }

    return tx
}