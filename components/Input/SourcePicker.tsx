import SourceWalletPicker from "./SourceWalletPicker";
import { PlusIcon } from "lucide-react";
import RoutePicker from "./RoutePicker";
import AmountField from "./Amount";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useFee } from "../../context/feeContext";
import MinMax from "./Amount/MinMax";
import { LayoutGroup, motion } from "framer-motion";

const SourcePicker = () => {
    const { values } = useFormikContext<SwapFormValues>();

    const { fromCurrency, from, to } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi } = useFee()

    return (<div className="rounded-lg pt-2.5">
        <div className="flex justify-between items-center px-4 pt-2">
            <label htmlFor="From" className="block font-medium text-secondary-text text-sm pl-1 py-1">
                Send from
            </label>
            <SourceWalletPicker />
        </div>
        <div className="p-3 pb-4 pr-4 rounded-xl items-center space-y-2 relative">
            {
                from && to && fromCurrency && minAllowedAmount && maxAmountFromApi &&
                <div className="absolute z-10 top-0 left-3">
                    <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} />
                </div>
            }
            <LayoutGroup>
                <div className="grid grid-cols-8 gap-2 group mt-0.5">
                    <motion.div
                        layout="size"
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        style={{ overflow: 'hidden' }}
                        className="col-span-5 group-has-[.input-wide]:col-span-6 flex items-center self-start justify-end"
                    >
                        <AmountField />
                    </motion.div>
                    <motion.div
                        layout="size"
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        style={{ overflow: 'hidden' }}
                        className="col-span-3 group-has-[.input-wide]:col-span-2 flex items-center self-start justify-end"
                    >
                        <RoutePicker direction="from" />
                    </motion.div>
                </div>
            </LayoutGroup>
        </div>
    </div>)
}

export const SecondDestinationWalletPicker = () => {
    return <div className=" justify-center w-full pl-3 py-2 bg-secondary-600 items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12">
        <PlusIcon className="stroke-1" /> <span>Destination Address</span>
    </div>
}


export default SourcePicker