import { Gas, GasProps } from "../../../Models/Balance";
import { Network } from "../../../Models/Network";
import ZkSyncLiteRPCClient from "../../balances/zksync/zksyncLiteRpcClient";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";

export class ZkSyncGasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.ZksyncMainnet.includes(network.name)
    }

    getGas = async ({ address, network, token, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe' }: GasProps) => {

        let gas: Gas[] = [];
        const client = new ZkSyncLiteRPCClient();
        
        try {
            const result = await client.getTransferFee(network.node_url, recipientAddress as `0x${string}`, token.symbol);
            const currencyDec = token.decimals;
            const formatedGas = formatAmount(Number(result.totalFee) * 1.5, Number(currencyDec))

            gas = [{
                token: token.symbol,
                gas: formatedGas,
                request_time: new Date().toJSON()
            }]
        }
        catch (e) {
            console.log(e)
        }

        return gas
    }
}