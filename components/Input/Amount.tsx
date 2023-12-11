import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import NumericInput from "./NumericInput";
import SecondaryButton from "../buttons/secondaryButton";
import { useBalancesState, useBalancesUpdate } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useFee } from "../../context/feeContext";
import debounce from 'lodash/debounce';

const AmountField = forwardRef(function AmountField(_, ref: any) {

    const { values, setFieldValue, handleChange } = useFormikContext<SwapFormValues>();
    const [requestedAmountInUsd, setRequestedAmountInUsd] = useState<string>();
    const { fromCurrency, from, to, amount, destination_address } = values || {};
    const { mutateFee, minAllowedAmount, maxAllowedAmount } = useFee()

    const { balances, isBalanceLoading, gases, isGasLoading } = useBalancesState()
    const { getBalance, getGas } = useBalancesUpdate()
    const name = "amount"
    const walletBalance = balances?.find(b => b?.network === from?.internal_name && b?.token === fromCurrency?.asset)
    const walletBalanceAmount = walletBalance?.amount && truncateDecimals(walletBalance?.amount, fromCurrency?.precision)

    const maxAllowedDisplayAmount = maxAllowedAmount && truncateDecimals(maxAllowedAmount, fromCurrency?.precision)

    const placeholder = (fromCurrency && from && to && !isBalanceLoading && !isGasLoading) ? `${minAllowedAmount} - ${maxAllowedDisplayAmount}` : '0.01234'
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

    const handleSetMaxAmount = useCallback(() => {
        setFieldValue(name, maxAllowedAmount);
        from && getBalance(from);
        from && fromCurrency && getGas(from, fromCurrency, destination_address || "");
        if (maxAllowedAmount)
            updateRequestedAmountInUsd(maxAllowedAmount)
    }, [from, fromCurrency, destination_address, maxAllowedAmount])

    const handleAmountChangeDebounced = debounce((newAmount) => {
        mutateFee()
    }, 500);

    useEffect(() => {
        if (amount) {
            handleAmountChangeDebounced({ amount });
        }

        return () => {
            handleAmountChangeDebounced.cancel();
        };
    }, [amount]);

    return (<>
        <AmountLabel detailsAvailable={!!(from && to && amount)}
            maxAllowedAmount={maxAllowedDisplayAmount}
            minAllowedAmount={minAllowedAmount}
            isBalanceLoading={(isBalanceLoading || isGasLoading)}
        />
        <div className="flex w-full justify-between bg-secondary-700 rounded-lg">
            <div className="relative">
                <NumericInput
                    disabled={!fromCurrency}
                    placeholder={placeholder}
                    min={minAllowedAmount}
                    max={maxAllowedAmount}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    className="rounded-r-none text-primary-text w-full !pb-6 text-lg"
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                        updateRequestedAmountInUsd(parseFloat(e.target.value))
                    }}
                >
                    {requestedAmountInUsd ? (
                        <span className="absolute block w-full min-w-0 rounded-lg font-semibold border-0 pl-3 text-xs pb-2">
                            ${requestedAmountInUsd}
                        </span>
                    ) : null}
                </NumericInput>
            </div>
            <div className="inline-flex items-center">
                {
                    from && to && fromCurrency ? <div className="text-xs flex flex-col items-center space-x-1 md:space-x-2 ml-2 md:ml-5 pt-2 px-2">
                        <div className="flex">
                            <SecondaryButton onClick={handleSetMinAmount} size="xs">
                                MIN
                            </SecondaryButton>
                            <SecondaryButton onClick={handleSetMaxAmount} size="xs" className="ml-1.5">
                                MAX
                            </SecondaryButton>
                        </div>
                        {
                            walletBalanceAmount != undefined && !isNaN(walletBalanceAmount) &&
                            <div className='bg-secondary-700 py-2 px-2 pl-0 text-xs'>
                                <span>Balance:&nbsp;</span>
                                {isBalanceLoading ?
                                    <span className="ml-1 h-3 w-6 rounded-sm bg-gray-500 animate-pulse" />
                                    :
                                    <span>{walletBalanceAmount}</span>}
                            </div>
                        }
                    </div>
                        : <></>
                }

            </div>
        </div>
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