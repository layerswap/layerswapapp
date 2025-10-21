import { GasProps } from "@/Models/Balance";
import { Network } from "@/Models/Network";
import { formatUnits } from "viem";
import KnownInternalNames from "../../knownIds";
import ZkSyncLiteRPCClient from "../../balances/providers/zkSyncBalanceProvider";
import { GasProvider } from "./types";

export class ZkSyncGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.ZksyncMainnet.includes(network.name)
    }

    getGas = async ({ address, network, token, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe' }: GasProps) => {

        const client = new ZkSyncLiteRPCClient();

        try {
            const result = await client.getTransferFee(network.node_url, recipientAddress as `0x${string}`, token.symbol);
            const currencyDec = token.decimals;
            const formatedGas = Number(formatUnits(BigInt(Math.floor(Number(result.totalFee) * 1.5)), Number(currencyDec)))

            if (formatedGas) return { gas: formatedGas, token }
        }
        catch (e) {
            console.log(e)
        }
    }
}