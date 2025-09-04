import SourceWalletPicker from "./SourceWalletPicker";
import RoutePicker from "./RoutePicker";
import AmountField from "./Amount";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import MinMax from "./Amount/MinMax";
import { LayoutGroup, motion } from "framer-motion";
import { useQuoteData } from "@/hooks/useFee";
import clsx from "clsx";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useState } from "react";

type Props = {
    minAllowedAmount: ReturnType<typeof useQuoteData>['minAllowedAmount'];
    maxAllowedAmount: ReturnType<typeof useQuoteData>['maxAllowedAmount'];
    fee: ReturnType<typeof useQuoteData>['quote'];
}

const SourcePicker = ({ minAllowedAmount, maxAllowedAmount: maxAmountFromApi, fee }: Props) => {
    const { values } = useFormikContext<SwapFormValues>()

    const { fromAsset: fromCurrency, from, depositMethod } = values || {}
    const { ref: parentRef, isActive: showQuickActions, activate: setShowQuickActions } = useClickOutside<HTMLDivElement>(false)
    const [actiontempValue, setActionTempValue] = useState<number | undefined>(0)

    const handleActionHover = (value: number | undefined) => {
        setActionTempValue(value)
    }

    return <div className="flex flex-col w-full bg-secondary-500 rounded-2xl p-4 pb-[15px] space-y-[27px] group" onClick={setShowQuickActions} ref={parentRef}>
        <div className="grid grid-cols-9 sm:grid-cols-8 gap-2 items-center h-7">
            <label htmlFor="From" className="block col-span-5 font-normal text-secondary-text text-base leading-5 mt-0.5">
                Send from
            </label>
            <div className="hover:bg-secondary-400 col-span-4 sm:col-span-3 rounded-lg py-1 pl-2 pr-1.5">
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
                    "group-hover:block"
                )}>
                    <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} onActionHover={handleActionHover} depositMethod={depositMethod} />
                </div>
            }
            <div className="grid grid-cols-9 sm:grid-cols-8 gap-2">
                <AmountField fee={fee} actionValue={actiontempValue} className="col-span-5" />
                <RoutePicker direction="from" className="col-span-4 sm:col-span-3 flex items-center self-start justify-end" />
            </div>
        </div>
    </div>
}

export default SourcePicker