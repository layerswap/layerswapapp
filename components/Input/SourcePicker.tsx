import SourceWalletPicker from "./SourceWalletPicker";
import RoutePicker from "./RoutePicker/RoutePicker";
import AmountField from "./Amount";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useQuote } from "../../context/feeContext";
import MinMax from "./Amount/MinMax";
import { LayoutGroup, motion } from "framer-motion";

const SourcePicker = () => {
    const { values } = useFormikContext<SwapFormValues>();

    const { fromCurrency, from, to } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi } = useQuote()

    return <div className="flex flex-col w-full bg-secondary-500 rounded-2xl py-4.5 px-4 space-y-8">
        <div className="flex justify-between items-center">
            <label htmlFor="From" className="block font-medium text-secondary-text text-sm">
                Send from
            </label>
            <SourceWalletPicker />
        </div>
        <div className="relative">
            {
                from && to && fromCurrency && minAllowedAmount && maxAmountFromApi &&
                <div className="absolute z-10 -top-6 left-0">
                    <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} />
                </div>
            }
            <LayoutGroup>
                <div className="grid grid-cols-8 gap-2 group">
                    <motion.div
                        layout
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="col-span-5 group-has-[.input-wide]:col-span-6"
                    >
                        <AmountField />
                    </motion.div>
                    <motion.div
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="col-span-3 group-has-[.input-wide]:col-span-2 flex items-center self-start justify-end"
                    >
                        <RoutePicker direction="from" />
                    </motion.div>
                </div>
            </LayoutGroup>
        </div>
    </div>
}

export default SourcePicker