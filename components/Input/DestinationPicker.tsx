import { PlusIcon } from "lucide-react";
import RoutePicker from "./RoutePicker";
import Address from "./Address";
import DestinationWalletPicker from "./DestinationWalletPicker";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { Partner } from "../../Models/Partner";
import useWallet from "../../hooks/useWallet";
import { ReceiveAmount } from "./Amount/ReceiveAmount";
import { useQuoteData } from "@/hooks/useFee";

type Props = {
    partner?: Partner
}

const DestinationPicker = (props: Props) => {
    const { partner } = props
    const { values } = useFormikContext<SwapFormValues>()
    const { fromExchange, destination_address, to, from, depositMethod, fromAsset: fromCurrency, toAsset: toCurrency } = values
    const { quote: fee, isQuoteLoading: isFeeLoading, isUpdatingValues } = useQuoteData(values)
    const sourceWalletNetwork = fromExchange ? undefined : from
    const destinationWalletNetwork = to

    const { provider: withdrawalProvider } = useWallet(sourceWalletNetwork, 'withdrawal')
    const { provider: autofilProvider } = useWallet(destinationWalletNetwork, 'autofil')

    const showAddDestinationAddress = !destination_address && to && ((from && autofilProvider?.id !== withdrawalProvider?.id) || depositMethod === 'deposit_address')

    return <div className='flex flex-col w-full bg-secondary-500 rounded-2xl py-4.5 px-4 space-y-8'>
        <div className="flex justify-between items-center h-[20px]">
            <label htmlFor="To" className="block font-medium text-secondary-text text-sm w-30">
                Receive at
            </label>
            <div className="w-fit">
                <Address partner={partner}>
                    {({ destination, disabled, addressItem, connectedWallet, partner }) => <DestinationWalletPicker destination={destination} disabled={disabled} addressItem={addressItem} connectedWallet={connectedWallet} partner={partner} />}
                </Address>
            </div>
        </div>
        <div className="rounded-xl items-center space-y-2">
            <div className="grid grid-cols-8 gap-2">
                <div className="col-span-5">
                    <ReceiveAmount
                        source_token={fromCurrency}
                        destination_token={toCurrency}
                        fee={fee}
                        isFeeLoading={isFeeLoading}
                        isUpdatingValues={isUpdatingValues}
                    />
                </div>
                <div className="col-span-3 flex items-center self-start justify-end">
                    <RoutePicker direction="to" />
                </div>
            </div>
            {
                showAddDestinationAddress &&
                <div className="flex items-center col-span-6">
                    <Address partner={partner} >{SecondDestinationWalletPicker}</Address>
                </div>
            }
        </div>
    </div>
};

export const SecondDestinationWalletPicker = () => {
    return <div className=" justify-center w-full pl-3 pr-2 py-2 bg-secondary-400 items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 ">
        <PlusIcon className="stroke-1" /> <span>Destination Address</span>
    </div>
}

export default DestinationPicker