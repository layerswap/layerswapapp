import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useBalancesState } from "../../../context/balances";
import useWallet from "../../../hooks/useWallet";
import { useEffect, useMemo } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import useBalance from "../../../hooks/useBalance";
import { useSettingsState } from "../../../context/settings";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromCurrency, toCurrency, from } = values
    const { balances, isBalanceLoading } = useBalancesState()
    const { getAutofillProvider: getProvider } = useWallet()
    const { layers, sourceRoutes } = useSettingsState()

    const sourceWalletProvider = useMemo(() => {
        return from && getProvider(from)
    }, [from, getProvider])

    const destinationWalletProvider = useMemo(() => {
        return to && getProvider(to)
    }, [to, getProvider])
    const { fetchBalance, fetchGas, fetchAllBalances } = useBalance()

    const filteredNetworks = layers.filter(l => sourceRoutes.some(sr => sr.network.includes(l.internal_name) && l.assets))
    const activeNetworks = filteredNetworks.map(chain => {
        chain.assets = chain.assets.filter(asset => asset.availableInSource);
        return chain;
    });

    const sourceNetworkWallet = sourceWalletProvider?.getConnectedWallet()
    const destinationNetworkWallet = destinationWalletProvider?.getConnectedWallet()

    const walletBalance = sourceNetworkWallet && balances[sourceNetworkWallet.address]?.find(b => b?.network === from?.internal_name && b?.token === fromCurrency?.asset)
    const destinationBalance = destinationNetworkWallet && balances[destinationNetworkWallet.address]?.find(b => b?.network === to?.internal_name && b?.token === toCurrency?.asset)

    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, fromCurrency?.precision)
    const destinationBalanceAmount = destinationBalance?.amount && truncateDecimals(destinationBalance?.amount, toCurrency?.precision)
    const balanceAmount = direction === 'from' ? walletBalanceAmount : destinationBalanceAmount

    useEffect(() => {
        direction === 'from' && values.from && fetchBalance({ network: values.from });
        direction === 'from' && values.from && fetchAllBalances(activeNetworks);
    }, [values.from, values.destination_address, sourceNetworkWallet?.address])

    useEffect(() => {
        direction === 'to' && values.to && fetchBalance({ network: values.to });
    }, [values.to, values.destination_address, sourceNetworkWallet?.address])

    const contract_address = values?.from?.assets.find(a => a.asset === values?.fromCurrency?.asset)?.contract_address

    useEffect(() => {
        direction === 'from' && sourceNetworkWallet?.address && values.from && values.fromCurrency && fetchGas(values.from, values.fromCurrency, values.destination_address || sourceNetworkWallet.address)
    }, [contract_address, values.from, values.fromCurrency, sourceNetworkWallet?.address])

    return (
        (direction === 'from' ? (from && fromCurrency) : (to && toCurrency)) && balanceAmount != undefined && !isNaN(balanceAmount) &&
        <div className="text-xs text-right absolute right-0 -top-7">
            <div className='bg-secondary-700 py-1.5 pl-2 text-xs'>
                <div>
                    <span>Balance:&nbsp;</span>
                    {isBalanceLoading ?
                        <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                        :
                        <span>{balanceAmount}</span>}
                </div>
            </div>
        </div>
    )
}

export default Balance