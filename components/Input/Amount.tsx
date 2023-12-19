import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import NumericInput from "./NumericInput";
import SecondaryButton from "../buttons/secondaryButton";
import { useBalancesState, useBalancesUpdate } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useFee } from "../../context/feeContext";
import useWallet from "../../hooks/useWallet";

const AmountField = forwardRef(function AmountField(_, ref: any) {

    const { values, setFieldValue, handleChange } = useFormikContext<SwapFormValues>();
    const [requestedAmountInUsd, setRequestedAmountInUsd] = useState<string>();
    const { fromCurrency, from, to, amount, destination_address, toCurrency } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi } = useFee()
    const [isAmountVisible, setIsAmountVisible] = useState(false);

    const { balances, isBalanceLoading, gases, isGasLoading } = useBalancesState()
    const { getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return values.from && getProvider(values.from)
    }, [values.from, getProvider])

    const wallet = provider?.getConnectedWallet()
    const gasAmount = gases[from?.internal_name || '']?.find(g => g?.token === fromCurrency?.asset)?.gas || 0
    const { getBalance, getGas } = useBalancesUpdate()
    const name = "amount"
    const walletBalance = wallet && balances[wallet.address]?.find(b => b?.network === from?.internal_name && b?.token === fromCurrency?.asset)
    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, fromCurrency?.precision)

    const maxAllowedAmount = (walletBalance &&
        maxAmountFromApi &&
        minAllowedAmount &&
        ((walletBalance.amount - gasAmount) >= minAllowedAmount &&
            (walletBalance.amount - gasAmount) <= maxAmountFromApi)) ?
        walletBalance.amount - Number(gasAmount)
        : maxAmountFromApi

    const maxAllowedDisplayAmount = maxAllowedAmount && truncateDecimals(maxAllowedAmount, fromCurrency?.precision)

    const placeholder = (fromCurrency && toCurrency && from && to && minAllowedAmount && !isBalanceLoading && !isGasLoading) ? `${minAllowedAmount} - ${maxAllowedDisplayAmount}` : '0.01234'
    const step = 1 / Math.pow(10, fromCurrency?.precision || 1)
    const amountRef = useRef(ref)

    const updateRequestedAmountInUsd = useCallback((requestedAmount: number) => {
        if (fromCurrency?.usd_price && !isNaN(requestedAmount)) {
            setRequestedAmountInUsd((fromCurrency?.usd_price * requestedAmount).toFixed(2));
        } else {
            setRequestedAmountInUsd(undefined);
        }
    }, [requestedAmountInUsd, fromCurrency]);

    const handleSetMinAmount = () => {
        setFieldValue(name, minAllowedAmount);
        if (minAllowedAmount)
            updateRequestedAmountInUsd(minAllowedAmount);
    }

    const handleSetMaxAmount = useCallback(async () => {
        from && await getBalance(from);
        from && fromCurrency && getGas(from, fromCurrency, destination_address || "");
        setFieldValue(name, maxAllowedAmount);
        if (maxAllowedAmount)
            updateRequestedAmountInUsd(maxAllowedAmount)
    }, [from, fromCurrency, destination_address, maxAllowedAmount])

    useEffect(() => {
        values.from && getBalance(values.from)
    }, [values.from, values.destination_address, wallet?.address])
    const contract_address = values.from?.isExchange == false ? values.from.assets.find(a => a.asset === values?.fromCurrency?.asset)?.contract_address : null

    useEffect(() => {
        wallet?.address && values.from && values.fromCurrency && getGas(values.from, values.fromCurrency, values.destination_address || wallet.address)
    }, [contract_address, values.from, values.fromCurrency, wallet?.address])

    return (<>
        <AmountLabel detailsAvailable={!!(from && to && amount)}
            maxAllowedAmount={maxAllowedDisplayAmount}
            minAllowedAmount={minAllowedAmount}
            isBalanceLoading={(isBalanceLoading || isGasLoading)}
        />
        <div className="flex w-full justify-between bg-secondary-700 rounded-lg">
            <div className="relative w-full">
                <NumericInput
                    disabled={!fromCurrency || !toCurrency}
                    placeholder={placeholder}
                    min={minAllowedAmount}
                    max={maxAllowedAmount}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    onFocus={() => setIsAmountVisible(false)}
                    onBlur={() => setIsAmountVisible(true)}
                    className={`${!isAmountVisible || !amountRef.current.value ? "text-xl" : "!pb-8"} rounded-r-none text-primary-text w-full truncate`}
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                        updateRequestedAmountInUsd(parseFloat(e.target.value));
                    }}
                >
                    {requestedAmountInUsd && isAmountVisible ? (
                        <span className="absolute block w-full min-w-0 rounded-lg font-semibold border-0 pl-3 text-xs pb-4">
                            ${requestedAmountInUsd}
                        </span>
                    ) : null}
                </NumericInput>
            </div>
            {
                from && to && fromCurrency ?
                    <div className="flex flex-col justify-center">
                        <div className={`${walletBalanceAmount != undefined && !isNaN(walletBalanceAmount) ? "pt-2" : ""} text-xs flex flex-col items-center space-x-1 md:space-x-2 ml-2 md:ml-5 px-2`}>
                            <div className="flex">
                                <SecondaryButton disabled={!minAllowedAmount} onClick={handleSetMinAmount} size="xs">
                                    MIN
                                </SecondaryButton>
                                <SecondaryButton disabled={!maxAllowedAmount} onClick={handleSetMaxAmount} size="xs" className="ml-1.5">
                                    MAX
                                </SecondaryButton>
                            </div>
                        </div>
                        {
                            walletBalanceAmount != undefined && !isNaN(walletBalanceAmount) &&
                            <div className="text-xs text-right">
                                <div className='bg-secondary-700 py-1.5 px-2 text-xs'>
                                    <div>
                                        <span>Balance:&nbsp;</span>
                                        {isBalanceLoading ?
                                            <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                                            :
                                            <span>{walletBalanceAmount}</span>}
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                    :
                    <></>
            }

        </div >
    </>)
});

type AmountLabelProps = {
    detailsAvailable: boolean;
    minAllowedAmount: number | undefined;
    maxAllowedAmount: number | undefined;
    isBalanceLoading: boolean;
}
const AmountLabel = ({
    detailsAvailable,
    minAllowedAmount,
    maxAllowedAmount,
    isBalanceLoading,
}: AmountLabelProps) => {
    return <div className="flex items-center w-full justify-between">
        <div className="flex items-center space-x-2">
            <p className="block font-semibold text-secondary-text text-sm">Amount</p>
            {
                detailsAvailable &&
                <div className="text-xs hidden md:flex text-secondary-text items-center">
                    <span>(Min:&nbsp;</span>{isBalanceLoading ? <span className="ml-1 h-3 w-6 rounded-sm bg-gray-500 animate-pulse" /> : <span>{minAllowedAmount}</span>}
                    <span>&nbsp;-&nbsp;Max:&nbsp;</span>{isBalanceLoading ? <span className="ml-1 h-3 w-6 rounded-sm bg-gray-500 animate-pulse" /> : <span>{maxAllowedAmount}</span>}<span>)</span>
                </div>
            }
        </div>
    </div>
}

export default AmountField