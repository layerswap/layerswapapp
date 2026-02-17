import SourceWalletPicker from "./SourceWalletPicker";
import RoutePicker from "./RoutePicker";
import AmountField from "./Amount";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import MinMax from "./Amount/MinMax";
import { useQuoteData } from "@/hooks/useFee";
import clsx from "clsx";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useState } from "react";

type Props = {
    minAllowedAmount: ReturnType<typeof useQuoteData>['minAllowedAmount'];
    maxAllowedAmount: ReturnType<typeof useQuoteData>['maxAllowedAmount'];
    minAllowedAmountInUsd: ReturnType<typeof useQuoteData>['minAllowedAmountInUsd'];
    maxAllowedAmountInUsd: ReturnType<typeof useQuoteData>['maxAllowedAmountInUsd'];
    fee: ReturnType<typeof useQuoteData>['quote'];
}

const SourcePicker = ({ minAllowedAmount, maxAllowedAmount: maxAmountFromApi, minAllowedAmountInUsd, maxAllowedAmountInUsd, fee }: Props) => {
    const { values } = useFormikContext<SwapFormValues>()

    const { fromAsset: fromCurrency, from, depositMethod } = values || {}
    const { ref: parentRef, isActive: showQuickActions, activate: setShowQuickActions } = useClickOutside<HTMLDivElement>(false)
    const [actiontempValue, setActionTempValue] = useState<number | undefined>(undefined)
    const [actionTempUsdValue, setActionTempUsdValue] = useState<string | undefined>(undefined)

    const handleActionHover = (value: number | undefined, usdValue?: string) => {
        setActionTempValue(value)
        setActionTempUsdValue(usdValue)
    }

    return <div className="flex flex-col w-full bg-secondary-500 rounded-2xl p-4 pb-[15px] space-y-[27px] group/source" onClick={setShowQuickActions} ref={parentRef}>
        <div className="grid grid-cols-9 gap-2 items-center h-7">
            <label htmlFor="From" className="block col-span-5 font-normal text-secondary-text text-base leading-5 mt-0.5">
                Send from
            </label>
            <div className="col-span-4 justify-self-end">
                <SourceWalletPicker />
            </div>
        </div>
        <div className="relative">
            {
                from && fromCurrency &&
                <div className={clsx(
                    "absolute z-10 -top-[26px] left-0",
                    {
                        "hidden": !showQuickActions,
                        "block": showQuickActions
                    },
                    "group-hover/source:block"
                )}>
                    <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} limitsMinAmountInUsd={minAllowedAmountInUsd} limitsMaxAmountInUsd={maxAllowedAmountInUsd} onActionHover={handleActionHover} depositMethod={depositMethod} />
                </div>
            }
            <div className="grid grid-cols-[1fr_auto] gap-1 w-full max-w-full">
                <div className="min-w-0 overflow-hidden">
                    <AmountField fee={fee} actionValue={actiontempValue} actionValueUsd={actionTempUsdValue} showToggle={showQuickActions} />
                </div>

                <div className="justify-self-end self-start">
                    <RoutePicker direction="from" />
                </div>
            </div>
        </div>
    </div>
}

export default SourcePicker