import { useFormikContext } from "formik";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import useSWRGas from "@/lib/gases/useSWRGas";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { useMemo } from "react";
import { resolveMaxAllowedAmount } from "./helpers";
import { updateForm } from "@/components/Swap/Form/updateForm";
import useWallet from "@/hooks/useWallet";
import { Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";


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

    const { provider } = useWallet(from, "withdrawal")
    const selectedSourceAccount = useMemo(() => provider?.activeWallet, [provider]);

    const { gasData } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency)
    const { balances, mutate: mutateBalances } = useSWRBalance(selectedSourceAccount?.address, from)

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

    const handleSetMinAmount = () => {
        if (!limitsMinAmount)
            throw new Error("Wallet balance is not available");
        handleSetValue(limitsMinAmount.toString())
    }
    const handleSetHalfAmount = async () => {
        if (!walletBalance)
            throw new Error("Wallet balance is not available");
        handleSetValue((walletBalance?.amount / 2).toString())
    }

    const handleSetMaxAmount = async () => {
        if (!maxAllowedAmount)
            throw new Error("Max amount is not available");
        handleSetValue(maxAllowedAmount.toString())
    }
    const halfOfBalance = (walletBalance?.amount || 0) / 2;
    const showMaxTooltip = depositMethod === 'wallet' && walletBalance && shouldPayGasWithTheToken && (!limitsMaxAmount || walletBalance.amount < limitsMaxAmount)

    return (
        <div className="flex gap-1.5 group text-xs leading-4" onMouseLeave={() => onActionHover(undefined)}>
            {
                Number(limitsMinAmount) > 0 &&
                <button
                    onMouseEnter={() => onActionHover(limitsMinAmount)}
                    disabled={!limitsMinAmount}
                    onClick={handleSetMinAmount}
                    typeof="button"
                    type="button"
                    className={"px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer"}
                >
                    Min
                </button>
            }
            {
                depositMethod === 'wallet' && halfOfBalance > 0 && (halfOfBalance < (maxAllowedAmount || Infinity)) &&
                <button
                    onMouseEnter={() => onActionHover(halfOfBalance)}
                    onClick={handleSetHalfAmount}
                    typeof="button"
                    type="button"
                    className={"px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer"}
                >
                    50%
                </button>
            }
            {
                Number(maxAllowedAmount) > 0 &&
                <>
                    <Tooltip disableHoverableContent={true}>
                        <TooltipTrigger asChild>
                            <button
                                onMouseEnter={() => onActionHover(maxAllowedAmount)}
                                disabled={!maxAllowedAmount}
                                onClick={handleSetMaxAmount}
                                typeof="button"
                                type="button"
                                className={"px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-300 hover:bg-secondary-200 text-secondary-text hover:text-primary-buttonTextColor cursor-pointer"}
                            >
                                Max
                            </button>
                        </TooltipTrigger>
                        {showMaxTooltip && <TooltipContent className="pointer-events-none w-80 grow p-2 !border-none !bg-secondary-300 text-xs rounded-xl" side="top" align="start" alignOffset={-10}>
                            <p>Max is calculated based on your balance minus gas fee for the transaction</p>
                            <TooltipArrow className="fill-secondary-300" width={12} height={8} />
                        </TooltipContent>}
                    </Tooltip>
                </>
            }
        </div >
    )
}

export default MinMax