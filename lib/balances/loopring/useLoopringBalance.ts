import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import axios from "axios";
import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../Models/Balance";

export default function useLoopringBalance(): BalanceProvider {
    const supportedNetworks = [
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringGoerli
    ]

    const getBalance = async ({ layer, address }: BalanceProps) => {
        let balances: Balance[] = [];

        const uri = 'https://api3.loopring.io/api/v3'

        if (!layer.assets) return
        try {

            const account: { data: AccountInfo } = await axios.get(`${uri}/account?owner=${address}`)
            const accInfo = account.data
            const tokens = layer?.assets?.map(obj => obj.contract).join(',');
            const result: { data: LpBalance[] } = await axios.get(`${uri}/user/balances?accountId=${accInfo.accountId}&tokens=${tokens}`)

            const loopringBalances = layer?.assets?.map(asset => {
                const amount = result.data.find(d => d.tokenId == Number(asset.contract))?.total;
                return ({
                    network: layer.internal_name,
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

    const getGas = async ({ layer, currency, address }: GasProps) => {
        let gas: Gas[] = [];
        if (!layer.assets) return

        const uri = 'https://api3.loopring.io/api/v3'

        try {

            const account: { data: AccountInfo } = await axios.get(`${uri}/account?owner=${address}`)
            const accInfo = account.data

            const result: { data: LpFee } = await axios.get(`${uri}/user/offchainFee?accountId=${accInfo.accountId}&requestType=3`)
            const currencyDec = layer?.assets?.find(c => c?.symbol == currency.symbol)?.decimals;
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

type LpFee = {
    fees: {
        token: string,
        tokenId: number,
        fee: string,
        discount: number
    }[],
    gasPrice: string
}