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

    const { fromAsset: fromCurrency, from } = values || {}
    const { ref: parentRef, isActive: showQuickActions, activate: setShowQuickActions } = useClickOutside<HTMLDivElement>(false)
    const [actiontempValue, setActionTempValue] = useState<number | undefined>(0)

    const handleActionHover = (value: number | undefined) => {
        setActionTempValue(value)
    }

    return <div className="flex flex-col w-full bg-secondary-500 rounded-2xl pt-4 pb-3.5 px-4 space-y-8 group" onClick={setShowQuickActions} ref={parentRef}>
        <div className="flex justify-between items-center h-7">
            <label htmlFor="From" className="block font-normal text-secondary-text text-base leading-5 mt-0.5">
                Send from
            </label>
            <div className="hover:bg-secondary-400 rounded-lg py-1 pl-2 pr-0.5">
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
                    <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} onActionHover={handleActionHover} />
                </div>
            }
            <LayoutGroup>
                <div className="grid grid-cols-9 sm:grid-cols-8 gap-2">
                    <motion.div
                        layout
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="col-span-5"
                    >
                        <AmountField fee={fee} actionValue={actiontempValue} />
                    </motion.div>
                    <motion.div
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="col-span-4 sm:col-span-3 flex items-center self-start justify-end"
                    >
                        <RoutePicker direction="from" />
                    </motion.div>
                </div>
            </LayoutGroup>
        </div>
    </div>
}

export default SourcePicker