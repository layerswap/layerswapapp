import { GasProps } from "@/Models/Balance";
import { Network } from "@/Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import ZkSyncLiteRPCClient from "./zkSyncBalanceProvider";
import { GasProvider } from "@/types/gas";

export class ZkSyncGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.ZksyncMainnet.includes(network.name)
    }
    getGas = async ({ network, token, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe' }: GasProps) => {

        const client = new ZkSyncLiteRPCClient();

        try {
            const result = await client.getTransferFee(network.node_url, recipientAddress as `0x${string}`, token.symbol);
            const currencyDec = token.decimals;
            const formatedGas = formatAmount(Number(result.totalFee) * 1.5, Number(currencyDec))

            if (formatedGas) return { gas: formatedGas, token }
        }
        catch (e) {
            console.log(e)
        }
    }
}