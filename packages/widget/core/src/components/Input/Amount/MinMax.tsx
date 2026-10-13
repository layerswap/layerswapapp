import { useFormikContext } from "formik";
import useSWRGas from "@/lib/gases/useSWRGas";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import React, { useMemo } from "react";
import { resolveMaxAllowedAmount } from "./helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useBalance } from "@/lib/balances/useBalance";
import useWallet from "@/hooks/useWallet";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { skipNextUsdSync } from "@/hooks/useUsdTokenSync";
import { ceilUsd, floorUsd } from "@/components/utils/formatUsdAmount";
import { ceilToDecimals, roundToDecimals, truncateToDecimals, isScientific } from "@/components/utils/RoundDecimals";

import { maxAmountSource } from '@/lib/maxAmount';

type MinMaxProps = {
    fromCurrency: NetworkRouteToken,
    from: NetworkRoute,
    limitsMaxAmount: number | undefined,
    limitsMinAmount: number | undefined,
    limitsMinAmountInUsd: number | undefined,
    limitsMaxAmountInUsd: number | undefined,
    onActionHover: (value: number | undefined, usdValue?: string) => void,
    depositMethod: 'wallet' | 'deposit_address' | undefined
}

const MinMax = (props: MinMaxProps) => {

    const { setValues, values } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, limitsMinAmount, limitsMaxAmount, limitsMinAmountInUsd, limitsMaxAmountInUsd, onActionHover, depositMethod } = props;
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const setUsdAmount = useUsdModeStore(s => s.setUsdAmount);
    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const { wallets } = useWallet(from, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const isWalletConnected = !!wallet
    const usingMax = values.amountMode === 'max'
    const { balances, mutate: mutateBalances } = useBalance(selectedSourceAccount?.address, from)

    const walletBalance = useMemo(() => {
        return isWalletConnected && selectedSourceAccount?.address ? balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    }, [isWalletConnected, selectedSourceAccount?.address, balances, from?.name, fromCurrency?.symbol])

    // Max must be able to correct an amount that exceeds the available balance.
    const enteredAmount = Number(values.amount)
    const balanceAmount = walletBalance?.amount
    const maxEstimationAmount = enteredAmount > 0
        ? Math.min(enteredAmount, balanceAmount != null && Number.isFinite(balanceAmount) && balanceAmount >= 0 ? balanceAmount : enteredAmount)
        : undefined
    const { gasData, gasError } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency, maxEstimationAmount, wallet)

    const gasAmount = gasError ? undefined : gasData?.gas;
    const gasReserve = gasError ? undefined : gasData?.reserve;

    const native_currency = gasData?.token || from?.token

    const shouldPayGasWithTheToken = (native_currency?.symbol === fromCurrency?.symbol) || !native_currency

    const fallbackAmount = useMemo(() => {
        const raw = fromCurrency.price_in_usd > 0 ? 0.01 / fromCurrency.price_in_usd : 0.01;
        return roundToDecimals(raw, fromCurrency.decimals);
    }, [fromCurrency.price_in_usd, fromCurrency.decimals]);

    const maxAllowedAmount = useMemo(() => {
        return resolveMaxAllowedAmount({ fromCurrency, limitsMaxAmount, walletBalance, gasAmount, gasReserve, native_currency, depositMethod });
    }, [fromCurrency, limitsMaxAmount, walletBalance, gasAmount, gasReserve, native_currency, depositMethod])

    const minAmount = useMemo(() => {
        if (walletBalance && walletBalance.amount !== undefined && limitsMinAmount !== undefined && depositMethod === 'wallet') {
            return Number(walletBalance.amount) < limitsMinAmount ? Number(walletBalance.amount) : limitsMinAmount;
        }
        return limitsMinAmount || fallbackAmount;
    }, [walletBalance, limitsMinAmount, fallbackAmount, depositMethod]);

    const halfOfBalance = useMemo(() => {
        const base = walletBalance?.amount || maxAllowedAmount;
        // Truncate, not nearest-round: half of the balance must never exceed it.
        return base ? Number(truncateToDecimals(String(base / 2), fromCurrency.decimals)) : 0;
    }, [walletBalance?.amount, maxAllowedAmount, fromCurrency.decimals]);

    const handleSetValue = (value: string, usdValue?: string, enableMax = false) => {
        void Promise.resolve(mutateBalances()).catch(() => undefined)
        const truncatedValue = truncateToDecimals(value, fromCurrency.decimals)
        const sanitizedValue = value !== '' && Number.isFinite(Number(value))
            ? (isScientific(truncatedValue)
                ? Number(truncatedValue).toFixed(fromCurrency.decimals).replace(/\.?0+$/, '')
                : truncatedValue)
            : value
        if (isUsdMode && usdValue) {
            // Only skip sync if the amount will actually change,
            // otherwise the sync effect won't fire to clear the flag.
            if (values.amount !== sanitizedValue) {
                skipNextUsdSync();
            }
            setUsdAmount(usdValue);
        }
        void setValues({ ...values, amount: sanitizedValue, amountMode: enableMax ? 'max' : 'manual',
            maxAmountSource: enableMax ? maxAmountSource(from.name, fromCurrency.symbol, selectedSourceAccount?.id, selectedSourceAccount?.address) : undefined,
            maxAmountPending: enableMax, maxAmountError: undefined }, true)
        onActionHover(undefined)
    }

    const minIsFromLimits = limitsMinAmount !== undefined && Math.abs(minAmount - limitsMinAmount) < 1e-10;
    const maxIsFromLimits = limitsMaxAmount !== undefined && maxAllowedAmount !== undefined && Math.abs(maxAllowedAmount - limitsMaxAmount) < 1e-10;

    // Quantize toward the safe side of each validation boundary: a backend
    // minimum rounds up (nearest could dip below it and fail immediately),
    // while a min derived from the wallet balance — like every max — is an
    // upper bound and truncates so the set value never exceeds it.
    const minValue = minIsFromLimits
        ? ceilToDecimals(minAmount, fromCurrency.decimals)
        : Number(truncateToDecimals(String(minAmount), fromCurrency.decimals));
    const maxValue = maxAllowedAmount === undefined ? undefined : truncateToDecimals(String(maxAllowedAmount), fromCurrency.decimals);

    const minUsdFormatted = minIsFromLimits && limitsMinAmountInUsd != undefined ? ceilUsd(limitsMinAmountInUsd) : undefined;
    const maxUsdFormatted = maxIsFromLimits && limitsMaxAmountInUsd != undefined ? floorUsd(limitsMaxAmountInUsd) : undefined;

    const handleSetMinAmount = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        handleSetValue(minValue.toString(), minUsdFormatted)
    }

    const handleSetHalfAmount = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        handleSetValue(halfOfBalance.toString())
    }

    const handleSetMaxAmount = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (usingMax) {
            void setValues({ ...values, amountMode: 'manual', maxAmountSource: undefined, maxAmountPending: false, maxAmountError: undefined }, true)
            onActionHover(undefined)
            return
        }
        if (maxValue === undefined) return
        handleSetValue(maxValue, maxUsdFormatted, isWalletConnected && depositMethod === 'wallet')
    }

    const showMaxTooltip = !!(depositMethod === 'wallet' && walletBalance?.amount && shouldPayGasWithTheToken && (!limitsMaxAmount || walletBalance.amount < limitsMaxAmount))

    if (!from || !fromCurrency)
        return null;

    return (
        <div className="flex gap-1.5 group text-xs leading-4" onMouseLeave={() => onActionHover(undefined)}>
            <ActionButton
                data-attr="min-amount"
                label="Min"
                onMouseEnter={() => onActionHover(minValue, minUsdFormatted)}
                onClick={handleSetMinAmount}
            />
            <ActionButton
                data-attr="half-amount"
                label="50%"
                onMouseEnter={() => onActionHover(halfOfBalance)}
                onClick={handleSetHalfAmount}
            />
            <Tooltip disableHoverableContent={true}>
                <TooltipTrigger asChild>
                    <ActionButton
                        data-attr="max-amount"
                        label={usingMax ? 'Using max' : 'Max'}
                        aria-pressed={usingMax}
                        disabled={!usingMax && isWalletConnected && maxValue === undefined}
                        onMouseEnter={() => onActionHover(maxValue === undefined ? undefined : Number(maxValue), maxUsdFormatted)}
                        onClick={handleSetMaxAmount}
                    />
                </TooltipTrigger>
                {showMaxTooltip ? <TooltipContent className="pointer-events-none w-80 grow p-2 border-none! bg-secondary-300! text-xs rounded-xl!" side="top" align="start" alignOffset={-10}>
                    <p>Using max keeps your amount updated for your balance and network fee until you confirm.</p>
                </TooltipContent> : null}
            </Tooltip>
        </div>
    )
}

export default MinMax

type ActionButtonProps = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMouseEnter: () => void;
    disabled?: boolean;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(({ label, onClick, onMouseEnter, disabled, ...rest }, ref) => {
    return (
        <button
            {...rest}
            ref={ref}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            type="button"
            disabled={disabled}
            className="px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer aria-pressed:bg-primary-500 aria-pressed:text-primary-buttonTextColor disabled:opacity-50 enabled:active:animate-press-down"
        >
            {label}
        </button>
    );
})
