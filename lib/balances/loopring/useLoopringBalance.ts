import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import axios from "axios";
import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../Models/Balance";
import { LoopringAPI } from "../../loopring/LoopringAPI";
import { LOOPRING_URLs, LpFee } from "../../loopring/defs";

export default function useLoopringBalance(): BalanceProvider {
    const supportedNetworks = [
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringGoerli
    ]

    const getBalance = async ({ network, address }: BalanceProps) => {
        let balances: Balance[] = [];

        if (!network.tokens) return
        try {

            const account: { data: AccountInfo } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`)
            const accInfo = account.data
            const tokens = network?.tokens?.map(obj => obj.contract).join(',');
            const result: { data: LpBalance[] } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_USER_EXCHANGE_BALANCES}?accountId=${accInfo.accountId}&tokens=${tokens}`)

            const loopringBalances = network?.tokens?.map(asset => {
                const amount = result.data.find(d => d.tokenId == Number(asset.contract))?.total;
                return ({
                    network: network.name,
                    token: asset?.symbol,
                    amount: amount ? formatAmount(amount, Number(asset?.decimals)) : 0,
                    request_time: new Date().toJSON(),
                    decimals: Number(asset?.decimals),
                    isNativeCurrency: false
                })
            });

            balances = [
                ...loopringBalances,
            ]
        }
        catch (e) {
            console.log(e)
        }

        return balances
    }

    const getGas = async ({ network: layer, currency, address }: GasProps) => {
        let gas: Gas[] = [];
        if (!layer.tokens) return

        try {

            const account: { data: AccountInfo } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`)
            const accInfo = account.data

            const result: { data: LpFee } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_OFFCHAIN_FEE_AMT}?accountId=${accInfo.accountId}&requestType=3`)
            const currencyDec = layer?.tokens?.find(c => c?.symbol == currency.symbol)?.decimals;
            const formatedGas = formatAmount(result.data.fees.find(f => f?.token === currency.symbol)?.fee, Number(currencyDec));

            gas = [{
                token: currency.symbol,
                gas: formatedGas,
                request_time: new Date().toJSON()
            }]
        }
        catch (e) {
            console.log(e)
        }

        return gas
    }

    return {
        getBalance,
        getGas,
        supportedNetworks
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

