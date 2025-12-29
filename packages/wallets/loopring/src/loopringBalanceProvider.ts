import axios from "axios";
import { formatUnits } from "viem";
import { KnownInternalNames, retry, insertIfNotExists } from "@layerswap/widget/internal";
import { TokenBalance, BalanceProvider } from "@layerswap/widget/types";
import { LoopringAPI } from "./services/LoopringAPI";
import { LOOPRING_URLs } from "./services/defs";

export class LoopringBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return (KnownInternalNames.Networks.LoopringMainnet.includes(network.name) || KnownInternalNames.Networks.LoopringGoerli.includes(network.name))
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {

        let balances: TokenBalance[] = [];

        if (!network?.tokens) return

        try {

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
                    amount: amount ? Number(formatUnits(BigInt(amount), Number(asset?.decimals))) : 0,
                    request_time: new Date().toJSON(),
                    decimals: Number(asset?.decimals),
                    isNativeCurrency: false,
                })
            });

            balances = [
                ...loopringBalances,
            ]
        }
        catch (e) {
            if (e?.response?.data?.resultInfo?.message === 'account not found') {
                return []
            }
            throw e
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

