import { useFormikContext } from "formik";
import useSWRGas from "@/lib/gases/useSWRGas";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import React, { useEffect, useId, useMemo, useRef } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { resolveMaxAllowedAmount } from "./helpers";
import { Tooltip, TooltipContent, TooltipTrigger, useHydratedReducedMotion } from "@layerswap/ui-kit";
import { useSelectedAccount } from "@/context/swapAccounts";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useBalance } from "@/lib/balances/useBalance";
import useWallet from "@/hooks/useWallet";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { skipNextUsdSync } from "@/hooks/useUsdTokenSync";
import { ceilUsd, floorUsd } from "@/components/utils/formatUsdAmount";
import { truncateToDecimals, isScientific } from "@layerswap/utils";

import { amountPresetSource, isWalletAmountFlow, resolvePresetAmount, supportsLiveAmountPreset, type AmountPreset } from '@/lib/amountPresets';

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
    const walletFlow = isWalletAmountFlow({ depositMethod, fromExchange: values.fromExchange })
    const live = walletFlow && isWalletConnected && !!selectedSourceAccount?.address && supportsLiveAmountPreset(from, fromCurrency)
    const selectedPreset = live ? values.amountMode : undefined
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
    const { gasData, gasError, isGasLoading } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency, maxEstimationAmount, wallet)

    // Amount changes start a new fee request. Keep the preset previews available
    // during that request; selecting one still sets pending and runs the live
    // controller's fresh calculation before the user can continue.
    const gasSource = `${depositMethod}:${amountPresetSource(from?.name, fromCurrency?.symbol, wallet?.id, selectedSourceAccount?.address)}`;
    const previousGas = useRef<{ source: string; data: typeof gasData } | undefined>(undefined);
    useEffect(() => {
        if (gasData && !gasError) {
            previousGas.current = { source: gasSource, data: gasData };
        } else if (!isGasLoading || gasError || previousGas.current?.source !== gasSource) {
            previousGas.current = undefined;
        }
    }, [gasSource, gasData, gasError, isGasLoading]);
    const previewGas = gasError ? undefined : gasData ?? (
        isGasLoading && previousGas.current?.source === gasSource ? previousGas.current.data : undefined
    );

    const gasAmount = previewGas?.gas;
    const gasReserve = previewGas?.reserve;

    const native_currency = previewGas?.token || from?.token

    const shouldPayGasWithTheToken = (native_currency?.symbol === fromCurrency?.symbol) || !native_currency

    const maxAllowedAmount = useMemo(() => {
        return resolveMaxAllowedAmount({ fromCurrency, limitsMaxAmount, walletBalance, gasAmount, gasReserve, native_currency, depositMethod: walletFlow ? 'wallet' : 'deposit_address' });
    }, [fromCurrency, limitsMaxAmount, walletBalance, gasAmount, gasReserve, native_currency, walletFlow])

    const minValue = limitsMinAmount === undefined ? undefined : resolvePresetAmount('min', 0, limitsMinAmount, fromCurrency.decimals);
    const maxValue = maxAllowedAmount === undefined ? undefined : resolvePresetAmount('max', maxAllowedAmount, 0, fromCurrency.decimals);
    // Live presets follow spendable funds. One-time shortcuts retain production's
    // balance-first calculation, falling back to the route maximum (or zero).
    const halfBase = live
        ? (walletBalance ? maxAllowedAmount : undefined)
        : walletBalance?.amount || maxAllowedAmount || 0;
    const halfValue = halfBase === undefined ? undefined : resolvePresetAmount('half', halfBase, 0, fromCurrency.decimals);

    // A selected preset stays available so it can be turned off while data refreshes.
    const minDisabled = selectedPreset !== 'min' && minValue === undefined;
    const halfDisabled = selectedPreset !== 'half' && halfValue === undefined;
    const maxDisabled = selectedPreset !== 'max' && maxValue === undefined;
    const allPresetsDisabled = minDisabled && halfDisabled && maxDisabled;

    const handleSetValue = (mode: AmountPreset, value: string, usdValue?: string) => {
        if (walletFlow && isWalletConnected) void Promise.resolve(mutateBalances()).catch(() => undefined)
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
        void setValues({ ...values, amount: sanitizedValue, amountMode: live ? mode : 'fixed',
            amountPresetSource: live ? amountPresetSource(from.name, fromCurrency.symbol, selectedSourceAccount?.id, selectedSourceAccount?.address) : undefined,
            amountPresetPending: live, amountPresetError: undefined, amountPresetBalance: undefined }, true)
        onActionHover(undefined)
    }

    const maxIsFromLimits = limitsMaxAmount !== undefined && maxAllowedAmount !== undefined && Math.abs(maxAllowedAmount - limitsMaxAmount) < 1e-10;
    const minUsdFormatted = limitsMinAmountInUsd != undefined ? ceilUsd(limitsMinAmountInUsd) : undefined;
    const maxUsdFormatted = maxIsFromLimits && limitsMaxAmountInUsd != undefined ? floorUsd(limitsMaxAmountInUsd) : undefined;

    const selectPreset = (e: React.MouseEvent<HTMLButtonElement>, mode: AmountPreset, value: string | undefined, usdValue?: string) => {
        e.preventDefault()
        e.stopPropagation()
        if (selectedPreset === mode) {
            void setValues({ ...values, amountMode: 'manual', amountPresetSource: undefined, amountPresetPending: false, amountPresetError: undefined }, true)
            onActionHover(undefined)
            return
        }
        if (value === undefined) return
        handleSetValue(mode, value, usdValue)
    }

    const showMaxTooltip = !maxDisabled && !!(walletFlow && walletBalance?.amount && shouldPayGasWithTheToken && (!limitsMaxAmount || walletBalance.amount < limitsMaxAmount))

    if (!from || !fromCurrency)
        return null;

    return (
        <LayoutGroup id={layoutId}>
            <div role="group" aria-label={live ? 'Amount presets' : 'Amount shortcuts'} aria-disabled={allPresetsDisabled} className="group/presets relative isolate inline-flex gap-0.5 rounded-lg bg-secondary-300/35 p-0.5 text-xs font-medium leading-4 transition-opacity duration-150 aria-disabled:opacity-40 motion-reduce:transition-none" onMouseLeave={() => onActionHover(undefined)}>
                <ActionButton
                    data-attr="min-amount"
                    label="Min"
                    aria-pressed={live ? selectedPreset === 'min' : undefined}
                    aria-label={live ? undefined : 'Set minimum amount'}
                    description={live ? undefined : 'Set the current minimum once. The amount will not update automatically.'}
                    disabled={minDisabled}
                    onMouseEnter={() => onActionHover(minValue === undefined ? undefined : Number(minValue), minUsdFormatted)}
                    onMouseLeave={() => onActionHover(undefined)}
                    onClick={e => selectPreset(e, 'min', minValue, minUsdFormatted)}
                />
                <ActionButton
                    data-attr="half-amount"
                    label="50%"
                    aria-pressed={live ? selectedPreset === 'half' : undefined}
                    description={live ? undefined : 'Set 50% once, using your wallet balance when available or the maximum amount otherwise.'}
                    disabled={halfDisabled}
                    onMouseEnter={() => onActionHover(halfValue === undefined ? undefined : Number(halfValue))}
                    onMouseLeave={() => onActionHover(undefined)}
                    onClick={e => selectPreset(e, 'half', halfValue)}
                />
                <ActionButton
                    data-attr="max-amount"
                    label="Max"
                    aria-pressed={live ? selectedPreset === 'max' : undefined}
                    aria-label={live ? undefined : 'Set maximum amount'}
                    description={!live ? 'Set the current maximum once. The amount will not update automatically.' : showMaxTooltip ? 'Network fees are reserved from your balance.' : undefined}
                    disabled={maxDisabled}
                    onMouseEnter={() => onActionHover(maxValue === undefined ? undefined : Number(maxValue), maxUsdFormatted)}
                    onMouseLeave={() => onActionHover(undefined)}
                    onClick={e => selectPreset(e, 'max', maxValue, maxUsdFormatted)}
                />
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
    description?: string;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(({ label, description, onClick, onMouseEnter, disabled, ...rest }, ref) => {
    const reducedMotion = useHydratedReducedMotion();
    const selected = rest['aria-pressed'] === true;

    const button = (
        <button
            {...rest}
            ref={ref}
            onMouseEnter={disabled ? undefined : onMouseEnter}
            onClick={onClick}
            type="button"
            disabled={disabled}
            className={`relative min-w-11 rounded-md px-2 py-0.5 transition-colors duration-150 ${selected ? 'text-preset-selected-text' : 'text-preset-text enabled:hover:bg-secondary-300/50 enabled:hover:text-primary-text enabled:active:bg-secondary-300'} enabled:cursor-pointer disabled:cursor-default disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-preset-text disabled:text-secondary-text/40 group-aria-disabled/presets:disabled:text-secondary-text motion-reduce:transition-none`}
        >
            {selected ? <motion.span
                aria-hidden="true"
                layoutId={reducedMotion ? undefined : 'amount-preset-selection'}
                initial={false}
                className="pointer-events-none absolute inset-0 rounded-md bg-preset-selected shadow-xs"
                transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
            /> : null}
            <span className="relative z-10">{label}</span>
        </button>
    );
    return <Tooltip disableHoverableContent>
        <TooltipTrigger asChild className="cursor-inherit">
            <span tabIndex={disabled && description ? 0 : undefined} aria-label={disabled && description ? label : undefined} className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-preset-text">
                {button}
            </span>
        </TooltipTrigger>
        {description ? <TooltipContent className="pointer-events-none w-64 p-2 border-none! bg-secondary-300! text-xs rounded-xl!" side="top" align="start">
            <p>{description}</p>
        </TooltipContent> : null}
    </Tooltip>;
})
