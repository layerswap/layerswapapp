import SourceWalletPicker from "./SourceWalletPicker";
import RoutePicker from "./RoutePicker";
import AmountField from "./Amount";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import MinMax from "./Amount/MinMax";
import { LayoutGroup, motion } from "framer-motion";
import { useQuoteData } from "@/hooks/useFee";
import { useState } from "react";
import clsx from "clsx";
import sleep from "@/lib/wallets/utils/sleep";

type Props = {
    minAllowedAmount: ReturnType<typeof useQuoteData>['minAllowedAmount'];
    maxAllowedAmount: ReturnType<typeof useQuoteData>['maxAllowedAmount'];
    fee: ReturnType<typeof useQuoteData>['quote'];
}

const SourcePicker = ({ minAllowedAmount, maxAllowedAmount: maxAmountFromApi, fee }: Props) => {
    const { values } = useFormikContext<SwapFormValues>();

    const { fromAsset: fromCurrency, from, to, amount } = values || {};
    const [isAmountFocused, setIsAmountFocused] = useState(false);
    const showMinMax = isAmountFocused || !amount;

    return <div className="flex flex-col w-full bg-secondary-500 rounded-2xl py-4.5 px-4 space-y-8">
        <div className="flex justify-between items-center">
            <label htmlFor="From" className="block font-normal text-secondary-text text-base leading-5">
                Send from
            </label>
            <div className="hover:bg-secondary-400 rounded-lg p-1.5 -m-1.5">
                <SourceWalletPicker />
            </div>
        </div>
        <div className="relative group">
            {
                from && to && fromCurrency && minAllowedAmount && maxAmountFromApi &&
                <div className={clsx(
                    "absolute z-10 -top-6 left-0",
                    {
                        "hidden": !showMinMax,
                        "block": showMinMax
                    }
                )}>
                    <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} />
                </div>
            }
            <LayoutGroup>
                <div className="grid grid-cols-8 gap-2 group">
                    <motion.div
                        layout
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="col-span-5"
                    >
                        <AmountField
                            onAmountFocus={() => setIsAmountFocused(true)}
                            onAmountBlur={async () => { await sleep(500); setIsAmountFocused(false) }}
                            minAllowedAmount={minAllowedAmount}
                            maxAllowedAmount={maxAmountFromApi}
                            fee={fee}
                        />
                    </motion.div>
                    <motion.div
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="col-span-3 flex items-center self-start justify-end"
                    >
                        <RoutePicker direction="from" />
                    </motion.div>
                </div>
            </LayoutGroup>
        </div>
    </div>
}

export default SourcePicker