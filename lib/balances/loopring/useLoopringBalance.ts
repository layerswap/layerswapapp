import { Layer } from "../../../Models/Layer";
import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../hooks/useBalance";
import { Currency } from "../../../Models/Currency";
import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { LoopringAPI } from "../../loopring/LoopringAPI";

type PendingBalances = {
    withdraw: string;
    deposit: string;
}

type RawData = {
    accountId: number;
    tokenId: number;
    total: string;
    locked: string;
    pending: PendingBalances;
}

type Balances = {
    raw_data: RawData[];
}

export default function useLoopringBalance(): BalanceProvider {
    const name = 'loopring';
    const supportedNetworks = [
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringGoerli
    ]

    const getBalance = async ({layer, address}: BalanceProps) => {

        let balances: Balance[] = [];

        if (layer.isExchange === true || !layer.assets) return
        try {
            const { accInfo } = await LoopringAPI.exchangeAPI.getAccount({
                owner: address,
            });

            const tokens = layer?.assets?.map(obj => obj.contract_address).join(',');
            const result: Balances = await LoopringAPI.userAPI.getUserBalances({ accountId: accInfo.accountId, tokens: tokens }, "")

            const loopringBalances = layer?.assets.filter(a => a.status !== 'inactive').map(asset => {
                const amount = result.raw_data.find(d => d.tokenId == Number(asset.contract_address))?.total;
                return ({
                    network: layer.internal_name,
                    token: asset?.asset,
                    amount: amount ? formatAmount(amount, Number(asset?.decimals)) : 0,
                    request_time: new Date().toJSON(),
                    decimals: Number(asset?.decimals),
                    isNativeCurrency: asset?.asset == "ETH" ? true : false
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

    const getGas = async ({layer, currency}: GasProps) => {

        let gas: Gas[] = [];
        if (layer.isExchange === true || !layer.assets) return

        try {
            const result = await LoopringAPI.exchangeAPI.getGasPrice();
            const currencyDec = layer?.assets?.find(c => c?.asset == currency.asset)?.decimals;
            const formatedGas = formatAmount(result.gasPrice, Number(currencyDec));
            
            gas = [{
                token: currency.asset,
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
        name,
        supportedNetworks
    }
}