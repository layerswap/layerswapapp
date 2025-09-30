import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useSWRGas from "@/lib/gases/useSWRGas";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import React, { useMemo } from "react";
import { resolveMaxAllowedAmount } from "./helpers";
import { updateForm } from "@/components/Swap/Form/updateForm";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { useSelectedAccount } from "@/context/balanceAccounts";
import { useBalance } from "@/lib/balances/useBalance";

type MinMaxProps = {
    fromCurrency: NetworkRouteToken,
    from: NetworkRoute,
    limitsMaxAmount: number | undefined,
    limitsMinAmount: number | undefined,
    onActionHover: (value: number | undefined) => void,
    depositMethod: 'wallet' | 'deposit_address' | undefined
}

const MinMax = (props: MinMaxProps) => {

    const { setFieldValue } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, limitsMinAmount, limitsMaxAmount, onActionHover, depositMethod } = props;

    const selectedSourceAccount = useSelectedAccount("from", from?.name);

    const { gasData } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency)
    const { balances, mutate: mutateBalances } = useBalance(selectedSourceAccount?.address, from)

    const walletBalance = useMemo(() => {
        return selectedSourceAccount?.address ? balances?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol) : undefined
    }, [selectedSourceAccount?.address, balances, from?.name, fromCurrency?.symbol])

    const gasAmount = gasData?.gas || 0;

    const native_currency = gasData?.token || from?.token

    const shouldPayGasWithTheToken = (native_currency?.symbol === fromCurrency?.symbol) || !native_currency

    let maxAllowedAmount: number | undefined = useMemo(() => {
        return resolveMaxAllowedAmount({ fromCurrency, limitsMaxAmount, walletBalance, gasAmount, native_currency, depositMethod })
    }, [fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency, depositMethod])

    const handleSetValue = (value: string) => {
        mutateBalances()
        updateForm({
            formDataKey: 'amount',
            formDataValue: value,
            setFieldValue
        })
        onActionHover(undefined)
    }

    const handleSetMinAmount = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (!limitsMinAmount)
            throw new Error("Wallet balance is not available");
        handleSetValue(limitsMinAmount.toString())
    }
    const handleSetHalfAmount = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (!walletBalance?.amount)
            throw new Error("Wallet balance is not available");
        handleSetValue((walletBalance?.amount / 2).toString())
    }

    const handleSetMaxAmount = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (!maxAllowedAmount)
            throw new Error("Max amount is not available");
        handleSetValue(maxAllowedAmount.toString())
    }
    const halfOfBalance = (walletBalance?.amount || 0) / 2;
    const showMaxTooltip = !!(depositMethod === 'wallet' && walletBalance?.amount && shouldPayGasWithTheToken && (!limitsMaxAmount || walletBalance.amount < limitsMaxAmount))

    return (
        <div className="flex gap-1.5 group text-xs leading-4" onMouseLeave={() => onActionHover(undefined)}>
            {
                Number(limitsMinAmount) > 0 ?
                    <ActionButton
                        label="Min"
                        onMouseEnter={() => onActionHover(limitsMinAmount)}
                        onClick={handleSetMinAmount}
                        disabled={!limitsMinAmount}
                    />
                    :
                    null
            }
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
                        {showMaxTooltip ? <TooltipContent className="pointer-events-none w-80 grow p-2 !border-none !bg-secondary-300 text-xs rounded-xl" side="top" align="start" alignOffset={-10}>
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

type ActionButtonProps = {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMouseEnter: () => void;
    disabled?: boolean;
}

const ActionButton = ({ label, onClick, onMouseEnter, disabled }: ActionButtonProps) => {
    return (
        <button
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            typeof="button"
            type="button"
            disabled={disabled}
            className={"px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer enabled:active:animate-press-down"}
        >
            {label}
        </button>
    );
}