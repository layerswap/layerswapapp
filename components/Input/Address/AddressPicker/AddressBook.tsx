import { CommandGroup, CommandList, CommandWrapper } from "../../../shadcn/command";
import { addressFormat } from "../../../../lib/address/formatter";
import FilledCheck from "../../../icons/FilledCheck";
import { AddressGroup, AddressItem } from ".";
import { RouteNetwork } from "../../../../Models/Network";
import { FC } from "react";
import AddressWithIcon from "./AddressWithIcon";
import { Partner } from "../../../../Models/Partner";

type AddressBookProps = {
    addressBook: AddressItem[];
    onSelectAddress: (address: string) => void;
    destination: RouteNetwork;
    destination_address: string | undefined;
    partner?: Partner;
}

const AddressBook: FC<AddressBookProps> = ({ addressBook, onSelectAddress, destination, destination_address, partner }) => {

    return (
        <div className="text-left">
            <CommandWrapper>
                <CommandList>
                    <CommandGroup
                        heading={
                            <p className="text-sm text-secondary-text">Address Book</p>
                        }
                        className="[&_[cmdk-group-heading]]:!pb-1 [&_[cmdk-group-heading]]:!px-0 !py-0 !px-0"
                    >
                        <div className="space-y-0 w-full flex flex-col items-stretch max-h-[200px] overflow-y-auto styled-scroll">
                            {addressBook.sort(sortingByDate).map(item => {
                                const isSelected = addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!)
                                return (
                                    <button type="button" key={item.address} onClick={() => onSelectAddress(item.address)} className={`group/addressItem px-3 py-3 rounded-md hover:bg-secondary-700 w-full transition duration-200 ${addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-800'}`}>
                                        <div className={`flex items-center justify-between w-full`}>
                                            <AddressWithIcon addressItem={item} partner={partner} destination={destination} />
                                            <div className="flex h-6 items-center px-1">
                                                {
                                                    isSelected &&
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

const sortingByDate = (a: AddressItem, b: AddressItem) => {
    return (a.group === AddressGroup.RecentlyUsed && b.group === AddressGroup.ManualAdded) ? 0 : -1 +
        (a.date ? Math.abs(((new Date()).getTime() - new Date(a.date).getTime())) : 0)
        - (b.date ? Math.abs(((new Date()).getTime() - new Date(b.date).getTime())) : 0)
}

export default AddressBook;