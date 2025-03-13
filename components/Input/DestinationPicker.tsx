import SourceWalletPicker from "./SourceWalletPicker";
import { PlusIcon } from "lucide-react";
import RoutePicker from "./RoutePicker";
import Address from "./Address";
import DestinationWalletPicker from "./DestinationWalletPicker";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { Partner } from "../../Models/Partner";
import useWallet from "../../hooks/useWallet";

type Props = {
    partner?: Partner
}

const DestinationPicker = (props: Props) => {
    const { partner } = props;
    const { values: { toExchange, fromExchange, destination_address, to, from, depositMethod } } = useFormikContext<SwapFormValues>();
    const sourceWalletNetwork = fromExchange ? undefined : from
    const destinationWalletNetwork = toExchange ? undefined : to

    const { provider: withdrawalProvider } = useWallet(sourceWalletNetwork, 'withdrawal')
    const { provider: autofilProvider } = useWallet(destinationWalletNetwork, 'autofil')

    const showAddDestinationAddress = !destination_address && !toExchange && to && ((from && autofilProvider?.id !== withdrawalProvider?.id) || depositMethod === 'deposit_address')

    return (<div className={`rounded-t-lg`}>
        <div className="flex justify-between items-center px-3 pt-2">
            <label htmlFor="From" className="block font-medium text-secondary-text text-sm pl-1 py-1">
                To
            </label>
            {
                !toExchange &&
                <span><Address partner={partner} >{
                    ({ destination, disabled, addressItem, connectedWallet, partner }) => <DestinationWalletPicker destination={destination} disabled={disabled} addressItem={addressItem} connectedWallet={connectedWallet} partner={partner} />
                }</Address></span>
            }
        </div>
        <div className="p-3 rounded-xl items-center space-y-2">
            <RoutePicker direction="to" />
            {
                showAddDestinationAddress &&
                <div className="flex items-center col-span-6">
                    <Address partner={partner} >{SecondDestinationWalletPicker}</Address>
                </div>
            }
        </div>
    </div >)
};

export const SecondDestinationWalletPicker = () => {
    return <div className=" justify-center w-full pl-3 pr-2 py-2 bg-secondary-600 items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 ">
        <PlusIcon className="stroke-1" /> <span>Destination Address</span>
    </div>
}


export default DestinationPicker