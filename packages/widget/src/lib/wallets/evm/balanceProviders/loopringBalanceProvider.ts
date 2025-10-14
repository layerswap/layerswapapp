import axios from "axios";
import { NetworkWithTokens } from "@/Models/Network";
import formatAmount from "@/lib/formatAmount";
import KnownInternalNames from "@/lib/knownIds";
import { TokenBalance } from "@/Models/Balance";
import { insertIfNotExists } from "../../../balances/helpers";
import { BalanceProvider } from "@/types/balance";
import { LoopringAPI } from "../services/transferService/loopring/LoopringAPI";
import { LOOPRING_URLs } from "../services/transferService/loopring/defs";

export class LoopringBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return (KnownInternalNames.Networks.LoopringMainnet.includes(network.name) || KnownInternalNames.Networks.LoopringGoerli.includes(network.name))
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {

        let balances: TokenBalance[] = [];

        if (!network?.tokens) return

        try {

            const { retry } = await import("@/lib/retry")
            const account: { data: AccountInfo } = await retry(
                async () => (await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`, { timeout: options?.timeoutMs ?? 60000 })),
                options?.retryCount ?? 3,
                500
            )
            const accInfo = account.data
            const tokens = insertIfNotExists(network.tokens || [], network.token)
            const tokensString = tokens?.map(obj => obj.contract).join(',');
            const result: { data: LpBalance[] } = await retry(
                async () => (await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_USER_EXCHANGE_BALANCES}?accountId=${accInfo.accountId}&tokens=${tokensString}`, { timeout: options?.timeoutMs ?? 60000 })),
                options?.retryCount ?? 3,
                500
            )

            const loopringBalances = tokens?.map(asset => {
                const amount = result.data.find(d => d.tokenId == Number(asset.contract))?.total;
                return ({
                    network: network.name,
                    token: asset?.symbol,
                    amount: amount ? formatAmount(amount, Number(asset?.decimals)) : result.data ? 0 : undefined,
                    request_time: new Date().toJSON(),
                    decimals: Number(asset?.decimals),
                    isNativeCurrency: false,
                    error: (amount === undefined && !result.data) ? `Could not fetch balance for ${asset.symbol}` : undefined
                })
            });

            balances = [
                ...loopringBalances,
            ]
        }
        catch (e) {
            balances = network.tokens.map((currency) => (this.resolveTokenBalanceFetchError(e, currency, network)))
        }

        return balances
    }
}

interface AccountInfo {
    accountId: number;
}

type PendingBalances = {
    withdraw: string;
    deposit: string;
}

type LpBalance = {
    accountId: number;
    tokenId: number;
    total: string;
    locked: string;
    pending: PendingBalances;
}

