import { TransferProps } from "@layerswap/widget/types"
import { encodeFunctionData, erc20Abi, numberToHex, parseUnits } from "viem"
import { EVMGasProvider } from "../gasProviders"

export const tempoTransactionBuilder = async (params: TransferProps) => {
    const { amount, depositAddress, network, selectedWallet, token, sequenceNumber } = params

    if (!depositAddress)
        throw new Error('Missing deposit address')
    if (!token?.contract)
        throw new Error('Missing token contract for Tempo transfer')

    let data = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [
            depositAddress as `0x${string}`,
            parseUnits(amount.toString(), token.decimals)
        ]
    })

    if (sequenceNumber != null) {
        const memo = numberToHex(sequenceNumber, { size: 8 })
        data = `${data}${memo.slice(2)}` as `0x${string}`
    }

    const tx = {
        chainId: Number(network?.chain_id),
        to: token.contract as `0x${string}`,
        value: 0n,
        gas: undefined as bigint | undefined,
        data,
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
