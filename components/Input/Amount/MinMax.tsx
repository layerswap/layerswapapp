import { useFormikContext } from "formik";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import useSWRGas from "@/lib/gases/useSWRGas";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import React, { FC, useMemo } from "react";
import { resolveMaxAllowedAmount } from "./helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useBalance } from "@/lib/balances/useBalance";
import useWallet from "@/hooks/useWallet";

type MinMaxProps = {
    fromCurrency: NetworkRouteToken,
    from: NetworkRoute,
    limitsMaxAmount: number | undefined,
    limitsMinAmount: number | undefined,
    onActionHover: (value: number | undefined) => void,
    depositMethod: 'wallet' | 'deposit_address' | undefined,
    tokenUsdPrice?: number;
}

const MinMax = (props: MinMaxProps) => {

    const { setFieldValue, values } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, limitsMinAmount, limitsMaxAmount, onActionHover, depositMethod } = props;

    const selectedSourceAccount = useSelectedAccount("from", from?.name);
    const { wallets } = useWallet(from, 'withdrawal')
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const { gasData } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency, values.amount, wallet)
    const { balances, mutate: mutateBalances } = useBalance(selectedSourceAccount?.address, from)

    const walletBalance = useMemo(() => {
        return selectedSourceAccount?.address ? balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    }, [selectedSourceAccount?.address, balances, from?.name, fromCurrency?.symbol])

    const gasAmount = gasData?.gas || 0;

    const native_currency = gasData?.token || from?.token

    const shouldPayGasWithTheToken = (native_currency?.symbol === fromCurrency?.symbol) || !native_currency

    const fallbackAmount = useMemo(() => {
        return fromCurrency.price_in_usd > 0 ? 0.01 / fromCurrency.price_in_usd : 0.01;
    }, [fromCurrency.price_in_usd]);

    let maxAllowedAmount: number = useMemo(() => {
        return resolveMaxAllowedAmount({ fromCurrency, limitsMaxAmount, walletBalance, gasAmount, native_currency, depositMethod, fallbackAmount }) || 0;
    }, [fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency, depositMethod, fallbackAmount])

    const minAmount = useMemo(() => {
        if (walletBalance && walletBalance.amount !== undefined && limitsMinAmount !== undefined) {
            return Number(walletBalance.amount) < limitsMinAmount ? Number(walletBalance.amount) : limitsMinAmount;
        }
        return limitsMinAmount || fallbackAmount;
    }, [walletBalance, limitsMinAmount, fallbackAmount]);

    const halfOfBalance = (walletBalance?.amount || maxAllowedAmount) ? (walletBalance?.amount || maxAllowedAmount) / 2 : 0;

    const handleSetValue = (value: string) => {
        mutateBalances()
        setFieldValue('amount', value, true)
        onActionHover(undefined)
    }

    const handleSetMinAmount = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        handleSetValue(minAmount.toString())
    }

    const handleSetHalfAmount = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        handleSetValue(halfOfBalance.toString())
    }

    const handleSetMaxAmount = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        handleSetValue(maxAllowedAmount.toString())
    }

    const showMaxTooltip = !!(depositMethod === 'wallet' && walletBalance?.amount && shouldPayGasWithTheToken && (!limitsMaxAmount || walletBalance.amount < limitsMaxAmount))

    if (!from || !fromCurrency)
        return null;

    return (
        <div className="flex gap-1.5 group text-xs leading-4" onMouseLeave={() => onActionHover(undefined)}>
            <ActionButton
                data-attr="min-amount"
                label="Min"
                onMouseEnter={() => onActionHover(minAmount)}
                onClick={handleSetMinAmount}
            />
            <ActionButton
                data-attr="half-amount"
                label="50%"
                onMouseEnter={() => onActionHover(halfOfBalance)}
                onClick={handleSetHalfAmount}
            />
            {
                (depositMethod === 'wallet' && halfOfBalance > 0 && (halfOfBalance < (maxAllowedAmount || Infinity))) ?
                    <ActionButton
                        label="50%"
                        onMouseEnter={() => onActionHover(halfOfBalance)}
                        onClick={handleSetHalfAmount}
                    />
                    :
                    null
            }
            {
                Number(maxAllowedAmount) > 0 ?
                    <Tooltip disableHoverableContent={true}>
                        <TooltipTrigger asChild>
                            <ActionButton
                                label="Max"
                                onMouseEnter={() => onActionHover(maxAllowedAmount)}
                                disabled={!maxAllowedAmount}
                                onClick={handleSetMaxAmount}
                            />
                        </TooltipTrigger>
                        {showMaxTooltip ? <TooltipContent className="pointer-events-none w-80 grow p-2 border-none! bg-secondary-300! text-xs rounded-xl" side="top" align="start" alignOffset={-10}>
                            <p>Max is calculated based on your balance minus gas fee for the transaction</p>
                        </TooltipContent> : null}
                    </Tooltip>
                    :
                    null
            }
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

const ActionButton: FC<ActionButtonProps> = ({ label, onClick, onMouseEnter, disabled, ...rest }) => {
    return (
        <button
            {...rest}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            typeof="button"
            type="button"
            disabled={disabled}
            className="px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer enabled:active:animate-press-down"
        >
            {label}
        </button>
    );
}