import { BookOpen, History, AlertTriangle } from "lucide-react";
import shortenAddress from "../../../utils/ShortenAddress";
import { CommandGroup, CommandList, CommandWrapper } from "../../../shadcn/command";
import AddressIcon from "../../../AddressIcon";
import { addressFormat } from "../../../../lib/address/formatter";
import FilledCheck from "../../../icons/FilledCheck";
import { AddressGroup, AddressItem } from ".";
import { RouteNetwork } from "../../../../Models/Network";
import { FC } from "react";

type AddressBookProps = {
    addressBook: AddressItem[];
    onSelectAddress: (address: string) => void;
    destination: RouteNetwork;
    destination_address: string | undefined;
}

const AddressBook: FC<AddressBookProps> = ({ addressBook, onSelectAddress, destination, destination_address }) => {

    return (
        <div className="text-left">
            <CommandWrapper>
                <CommandList>
                    <CommandGroup
                        heading={
                            <div className="inline-flex items-center gap-2">
                                <BookOpen className='w-4 h-4' />
                                <span className="text-sm text-secondary-text">Address Book</span>
                            </div>
                        }
                        className="[&_[cmdk-group-heading]]:!pb-1 [&_[cmdk-group-heading]]:!px-0 !py-0 !px-0"
                    >
                        <div className="space-y-0 w-full flex flex-col items-stretch max-h-[200px] overflow-y-auto styled-scroll">
                            {addressBook.sort((a, b) =>
                                (a.group === AddressGroup.RecentlyUsed && b.group === AddressGroup.ManualAdded) ? 0 : -1 +
                                    (a.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(a.date).getTime()) / (1000 * 3600 * 24))) : 0)
                                    - (b.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(b.date).getTime()) / (1000 * 3600 * 24))) : 0)
                            ).map(item => {
                                const difference_in_days = item.date ? Math.round(Math.abs(((new Date()).getTime() - new Date(item.date).getTime()) / (1000 * 3600 * 24))) : undefined

                                return (
                                    <button type="button" key={item.address} onClick={() => onSelectAddress(item.address)} className={`px-3 py-3 rounded-md hover:bg-secondary-700 w-full transition duration-200 ${addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-800'}`}>
                                        <div className={`flex items-center justify-between w-full`}>
                                            <div className={`flex gap-3 text-sm items-center`}>
                                                <div className='flex bg-secondary-400 text-primary-text  items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                                                    <AddressIcon className="scale-150 h-9 w-9" address={item.address} size={36} />
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <div className="block text-sm font-medium">
                                                        {shortenAddress(item.address)}
                                                    </div>
                                                    <div className="text-secondary-text">
                                                        {
                                                            item.group === AddressGroup.RecentlyUsed &&
                                                            <div className="inline-flex items-center gap-1">
                                                                <History className="h-3 w-3" />
                                                                {
                                                                    (difference_in_days === 0 ?
                                                                        <p>Used today</p>
                                                                        :
                                                                        (difference_in_days && difference_in_days > 1 ?
                                                                            <p><span>Used</span> {difference_in_days} <span>days ago</span></p>
                                                                            : <p>Used yesterday</p>))
                                                                }
                                                            </div>
                                                        }
                                                        {
                                                            item.group === AddressGroup.ManualAdded &&
                                                            <div className="inline-flex items-center gap-1">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                <p>New Address</p>
                                                            </div>
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex h-6 items-center px-1">
                                                {
                                                    addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) &&
                                                    <FilledCheck />
                                                }
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </CommandGroup>
                </CommandList>
            </CommandWrapper>
        </div>
    )
}

export default AddressBook;