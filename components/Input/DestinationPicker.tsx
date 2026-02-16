import { PlusIcon } from "lucide-react";
import RoutePicker from "./RoutePicker";
import Address from "./Address";
import DestinationWalletPicker from "./DestinationWalletPicker";
import { useFormikContext } from "formik";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Partner } from "@/Models/Partner";
import { ReceiveAmount } from "./Amount/ReceiveAmount";
import { transformFormValuesToQuoteArgs, useQuoteData } from "@/hooks/useFee";
import { useMemo } from "react";
import { useSwapDataState } from "@/context/swap";

type Props = {
    partner?: Partner
    fee: ReturnType<typeof useQuoteData>['quote'],
    isFeeLoading: boolean
}

const DestinationPicker = (props: Props) => {
    const { partner } = props
    const { values } = useFormikContext<SwapFormValues>()
    const { toAsset: toCurrency } = values
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values, true), [values]);
    const { swapId } = useSwapDataState()
    const quoteRefreshInterval = !!swapId ? 0 : undefined;
    const { quote, isQuoteLoading } = useQuoteData(quoteArgs, quoteRefreshInterval)
    // console.log('quote', quote)
    console.log('quoteArgs', quoteArgs)
    return <div className="flex flex-col w-full bg-secondary-500 rounded-2xl p-4 pb-[15px] space-y-[27px]">
        <div className="grid grid-cols-9 gap-2 items-center h-7">
            <label htmlFor="To" className="block col-span-4 font-normal text-secondary-text text-base leading-5 w-30">
                Receive at
            </label>
            <div className="col-span-5 justify-self-end">
                <Address partner={partner}>
                    {({ destination, addressItem, connectedWallet, partner }) =>
                        <DestinationWalletPicker destination={destination} addressItem={addressItem} connectedWallet={connectedWallet} partner={partner} />}
                </Address>
            </div>
        </div>
        <div className="items-center space-y-2">
            <div className="grid grid-cols-[1fr_auto] gap-1 w-full max-w-full">
                <div className="min-w-0 overflow-hidden">
                    <ReceiveAmount
                        destination_token={toCurrency}
                        fee={quote}
                        isFeeLoading={isQuoteLoading}
                    />
                </div>
                <div className="justify-self-end self-start">
                    <RoutePicker direction="to" />
                </div>
            </div>
        </div>
    </div>
};

export const SecondDestinationWalletPicker = () => {
    return <div className=" justify-center w-full pl-3 pr-2 py-2 bg-secondary-400 items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 ">
        <PlusIcon className="stroke-1" /> <span>Destination Address</span>
    </div>
}

export default DestinationPicker