import SourceWalletPicker from "./SourceWalletPicker";
import { PlusIcon } from "lucide-react";
import RoutePicker from "./RoutePicker";
import AmountField from "./Amount";

const SourcePicker = () => {
    return (<div className={`rounded-lg pt-2.5`}>
        <div className="flex justify-between items-center px-4 pt-2">
            <label htmlFor="From" className="block font-medium text-secondary-text text-sm pl-1 py-1">
                Send from
            </label>
            <SourceWalletPicker />
        </div>
        <div className="p-3 pb-4 pr-4 rounded-xl items-center space-y-2">
            <div className="grid grid-cols-8 gap-2">
                <div className="col-span-5">
                    <AmountField />
                </div>
                <div className="col-span-3 flex items-center self-start">
                    <RoutePicker direction="from" />
                </div>
            </div>
        </div>
    </div >)
};

export const SecondDestinationWalletPicker = () => {
    return <div className=" justify-center w-full pl-3 pr-2 py-2 bg-secondary-600 items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 ">
        <PlusIcon className="stroke-1" /> <span>Destination Address</span>
    </div>
}


export default SourcePicker