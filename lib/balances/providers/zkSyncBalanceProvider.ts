import { BalanceFetchError, TokenBalance } from "../../../Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";

export class ZkSyncBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return KnownInternalNames.Networks.ZksyncMainnet.includes(network.name)
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const balances: TokenBalance[] = [];
        const errors: BalanceFetchError[] = [];

        const client = new ZkSyncLiteRPCClient();
        const tokens = insertIfNotExists(network.tokens || [], network.token)

        if (!network?.tokens) return

        const result = await client.getAccountInfo(network.node_url, address);

        for (const currency of tokens) {
            try {
                const amount = currency && result.committed.balances[currency.symbol]

                balances.push({
                    network: network.name,
                    token: currency.symbol,
                    amount: formatAmount(amount, Number(currency?.decimals)),
                    request_time: new Date().toJSON(),
                    decimals: Number(currency?.decimals),
                    isNativeCurrency: true
                });
            } catch (e: any) {
                errors.push({
                    network: network.name,
                    token: currency?.symbol,
                    message: e?.message ?? "Failed to parse zkSync balance",
                    code: e?.code ?? e?.response?.status,
                    cause: e,
                });
            }
        }

        return { balances, errors };
    }
}


import { PublicClient } from 'viem';
import { insertIfNotExists } from "./helpers";

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
