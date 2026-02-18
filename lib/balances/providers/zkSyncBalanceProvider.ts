import { NetworkWithTokens } from "@/Models/Network";
import { formatUnits } from "viem";
import KnownInternalNames from "@/lib/knownIds";

export class ZkSyncBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.ZksyncMainnet.includes(network.name)
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        const client = new ZkSyncLiteRPCClient();
        const tokens = insertIfNotExists(network.tokens || [], network.token)

        if (!network?.tokens) return

        try {
            const result = await client.getAccountInfo(network.node_url, address);
            const zkSyncBalances = tokens.map((currency) => {
                const amount = currency && result.committed.balances[currency.symbol]
                return ({
                    network: network.name,
                    token: currency.symbol,
                    amount: amount ? Number(formatUnits(BigInt(amount), Number(currency?.decimals))) : undefined,
                    request_time: new Date().toJSON(),
                    decimals: Number(currency?.decimals),
                    isNativeCurrency: true
                })
            });

            return zkSyncBalances
        }
        catch (e) {
            throw e
        }
    }

}


import { PublicClient } from 'viem';
import { insertIfNotExists } from "../helpers";
import { BalanceProvider } from "@/Models/BalanceProvider";

type Balances = {
    [currency: string]: string;
};

export type zkSyncGas = {
    feeType: string,
    gasFee: string,
    gasPriceWei: string,
    gasTxAmount: string,
    totalFee: string,
    zkpFee: string
}


export type AccountInfo = {
    committed: {
        balances: Balances;
        nonce: number;
        pubKeyHash: string;
    };
};

export default class ZkSyncLiteRPCClient {
    private _client: PublicClient;
    private async getPublicClient(nodeUrl: string) {
        if (this._client == undefined) {
            const { createPublicClient, http } = await import('viem');
            this._client = createPublicClient({
                transport: http(`${nodeUrl}jsrpc`)
            });
        }

        return this._client;
    }

    async getTransferFee(nodeUrl: string, recipientAddress: `0x${string}`, asset: string) {
        let client = await this.getPublicClient(nodeUrl);
        return await client.request({ method: 'get_tx_fee' as any, params: ["Transfer" as any, recipientAddress as `0x${string}`, asset as any] }) as zkSyncGas;
    }

    async getAccountInfo(nodeUrl: string, address: string) {
        let client = await this.getPublicClient(nodeUrl);
        return await client.request({ method: 'account_info' as any, params: [address as `0x${string}`] }) as AccountInfo;
    }
}
