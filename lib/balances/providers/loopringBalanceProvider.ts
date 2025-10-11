import axios from "axios";
import { NetworkWithTokens } from "@/Models/Network";
import formatAmount from "@/lib/formatAmount";
import KnownInternalNames from "@/lib/knownIds";
import { LOOPRING_URLs } from "@/lib/loopring/defs";
import { LoopringAPI } from "@/lib/loopring/LoopringAPI";
import { TokenBalance } from "@/Models/Balance";
import { insertIfNotExists } from "../helpers";
import { BalanceProvider } from "@/Models/BalanceProvider";

export class LoopringBalanceProvider extends BalanceProvider {
    supportsNetwork = (network: NetworkWithTokens): boolean => {
        return (KnownInternalNames.Networks.LoopringMainnet.includes(network.name) || KnownInternalNames.Networks.LoopringGoerli.includes(network.name))
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {

        let balances: TokenBalance[] = [];

        if (!network?.tokens) return

        try {

            const account: { data: AccountInfo } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`)
            const accInfo = account.data
            const tokens = insertIfNotExists(network.tokens || [], network.token)
            const tokensString = tokens?.map(obj => obj.contract).join(',');
            const result: { data: LpBalance[] } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_USER_EXCHANGE_BALANCES}?accountId=${accInfo.accountId}&tokens=${tokensString}`)

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

