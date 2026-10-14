import { useFormikContext } from "formik";
import useSWRGas from "@/lib/gases/useSWRGas";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import React, { useId, useMemo } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { resolveMaxAllowedAmount } from "./helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useBalance } from "@/lib/balances/useBalance";
import useWallet from "@/hooks/useWallet";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { skipNextUsdSync } from "@/hooks/useUsdTokenSync";
import { ceilUsd, floorUsd } from "@/components/utils/formatUsdAmount";
import { truncateToDecimals, isScientific } from "@/components/utils/RoundDecimals";
import { useHydratedReducedMotion } from "@/hooks/useHydratedReducedMotion";

import { amountPresetSource, resolvePresetAmount, type AmountPreset } from '@/lib/amountPresets';

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

    const layoutId = useId();
    const { setValues, values } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, limitsMinAmount, limitsMaxAmount, limitsMinAmountInUsd, limitsMaxAmountInUsd, onActionHover, depositMethod } = props;
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const setUsdAmount = useUsdModeStore(s => s.setUsdAmount);
    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const { wallets } = useWallet(from, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const isWalletConnected = !!wallet
    const walletFlow = depositMethod === 'wallet'
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

    const maxAllowedAmount = useMemo(() => {
        return resolveMaxAllowedAmount({ fromCurrency, limitsMaxAmount, walletBalance, gasAmount, gasReserve, native_currency, depositMethod });
    }, [fromCurrency, limitsMaxAmount, walletBalance, gasAmount, gasReserve, native_currency, depositMethod])

    const minValue = limitsMinAmount === undefined ? undefined : resolvePresetAmount('min', 0, limitsMinAmount, fromCurrency.decimals);
    const maxValue = maxAllowedAmount === undefined ? undefined : resolvePresetAmount('max', maxAllowedAmount, 0, fromCurrency.decimals);
    const halfValue = walletFlow && walletBalance && maxAllowedAmount !== undefined
        ? resolvePresetAmount('half', maxAllowedAmount, 0, fromCurrency.decimals) : undefined;

    const handleSetValue = (mode: AmountPreset, value: string, usdValue?: string) => {
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
        void setValues({ ...values, amount: sanitizedValue, amountMode: mode,
            amountPresetSource: amountPresetSource(from.name, fromCurrency.symbol, walletFlow && isWalletConnected ? selectedSourceAccount?.id : undefined, walletFlow && isWalletConnected ? selectedSourceAccount?.address : undefined),
            amountPresetPending: true, amountPresetError: undefined }, true)
        onActionHover(undefined)
    }

    const maxIsFromLimits = limitsMaxAmount !== undefined && maxAllowedAmount !== undefined && Math.abs(maxAllowedAmount - limitsMaxAmount) < 1e-10;
    const minUsdFormatted = limitsMinAmountInUsd != undefined ? ceilUsd(limitsMinAmountInUsd) : undefined;
    const maxUsdFormatted = maxIsFromLimits && limitsMaxAmountInUsd != undefined ? floorUsd(limitsMaxAmountInUsd) : undefined;

    const selectPreset = (e: React.MouseEvent<HTMLButtonElement>, mode: AmountPreset, value: string | undefined, usdValue?: string) => {
        e.preventDefault()
        e.stopPropagation()
        if (values.amountMode === mode) {
            void setValues({ ...values, amountMode: 'manual', amountPresetSource: undefined, amountPresetPending: false, amountPresetError: undefined }, true)
            onActionHover(undefined)
            return
        }
        if (value === undefined) return
        handleSetValue(mode, value, usdValue)
    }

    const showMaxTooltip = !!(depositMethod === 'wallet' && walletBalance?.amount && shouldPayGasWithTheToken && (!limitsMaxAmount || walletBalance.amount < limitsMaxAmount))

    if (!from || !fromCurrency)
        return null;

    return (
        <LayoutGroup id={layoutId}>
            <div role="group" aria-label="Amount presets" className="relative isolate inline-flex gap-0.5 rounded-lg bg-secondary-300/35 p-0.5 text-xs font-medium leading-4" onMouseLeave={() => onActionHover(undefined)}>
                <ActionButton
                    data-attr="min-amount"
                    label="Min"
                    aria-pressed={values.amountMode === 'min'}
                    disabled={values.amountMode !== 'min' && minValue === undefined}
                    onMouseEnter={() => onActionHover(minValue === undefined ? undefined : Number(minValue), minUsdFormatted)}
                    onClick={e => selectPreset(e, 'min', minValue, minUsdFormatted)}
                />
                <ActionButton
                    data-attr="half-amount"
                    label="50%"
                    aria-pressed={values.amountMode === 'half'}
                    disabled={values.amountMode !== 'half' && halfValue === undefined}
                    onMouseEnter={() => onActionHover(halfValue === undefined ? undefined : Number(halfValue))}
                    onClick={e => selectPreset(e, 'half', halfValue)}
                />
                <Tooltip disableHoverableContent={true}>
                    <TooltipTrigger asChild>
                        <ActionButton
                            data-attr="max-amount"
                            label="Max"
                            aria-pressed={values.amountMode === 'max'}
                            disabled={values.amountMode !== 'max' && maxValue === undefined}
                            onMouseEnter={() => onActionHover(maxValue === undefined ? undefined : Number(maxValue), maxUsdFormatted)}
                            onClick={e => selectPreset(e, 'max', maxValue, maxUsdFormatted)}
                        />
                    </TooltipTrigger>
                    {showMaxTooltip ? <TooltipContent className="pointer-events-none w-80 grow p-2 border-none! bg-secondary-300! text-xs rounded-xl!" side="top" align="start" alignOffset={-10}>
                        <p>Network fees are reserved from your balance.</p>
                    </TooltipContent> : null}
                </Tooltip>
            </div>
        </LayoutGroup>
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
    const reducedMotion = useHydratedReducedMotion();
    const selected = rest['aria-pressed'] === true;

    return (
        <button
            {...rest}
            ref={ref}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            type="button"
            disabled={disabled}
            className="relative min-w-11 rounded-md px-2 py-0.5 text-secondary-text transition-colors duration-150 enabled:hover:aria-[pressed=false]:bg-secondary-300/50 enabled:hover:aria-[pressed=false]:text-primary-text aria-pressed:text-secondary-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-text disabled:opacity-40 motion-reduce:transition-none"
        >
            {selected ? <motion.span
                aria-hidden="true"
                layoutId={reducedMotion ? undefined : 'amount-preset-selection'}
                initial={false}
                className="pointer-events-none absolute inset-0 rounded-md bg-primary-text shadow-xs"
                transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
            /> : null}
            <span className="relative z-10">{label}</span>
        </button>
    );
})
