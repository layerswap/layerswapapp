import { Command, CommandGroup, CommandItem, CommandList } from "@/components/shadcn/command";
import { Address } from "@/lib/address/Address";
import { AddressGroup, AddressItem } from ".";
import { NetworkRoute } from "@/Models/Network";
import { FC } from "react";
import AddressPickerItem from "./AddressPickerItem";
import { Partner } from "@/Models/Partner";
import { Wallet } from "@/types/wallet";
import { BookOpen } from "lucide-react";
import { useAddressNameFinder } from "@/stores/addressBookStore";

type AddressBookProps = {
    addressBook: AddressItem[];
    onSelectAddress: (address: string, wallet: Wallet | undefined) => void;
    destination: NetworkRoute;
    destination_address: string | undefined;
    partner?: Partner;
    onRemove?: (address: string, isBookEntry: boolean) => void;
}

const AddressBook: FC<AddressBookProps> = ({ addressBook, onSelectAddress, destination, destination_address, partner, onRemove }) => {
    const resolveName = useAddressNameFinder()

    return (
        <div className="text-left mt-1!">
            <Command>
                <CommandList>
                    <CommandGroup
                        heading={
                            <div className="flex items-center space-x-1">
                                <BookOpen className="h-4 w-4 stroke-2" aria-hidden="true" />
                                <p className="text-sm text-secondary-text">Address Book</p>
                            </div>
                        }
                        className="[&_[cmdk-group-heading]]:pb-1! [&_[cmdk-group-heading]]:px-0! py-0! px-0! [&_.bg-secondary-800]:bg-transparent!"
                    >
                        <div className="w-full flex flex-col items-stretch gap-2">
                            {addressBook.map(item => {
                                const isSelected = Address.equals(item.address, destination_address!, destination!)
                                const isBookEntry = !!resolveName(item.address, destination)
                                const handleRemove = onRemove && item.group === AddressGroup.ManualAdded ? () => onRemove(item.address, isBookEntry) : undefined
                                return (
                                    <CommandItem key={item.address} onSelect={() => onSelectAddress(item.address, item.wallet)} className="!p-0 outline-none">
                                        <AddressPickerItem item={item} network={destination} partner={partner} selected={isSelected} onRemove={handleRemove} />
                                    </CommandItem>
                                )
                            })}
                        </div>
                    </CommandGroup>
                </CommandList>
            </Command>
        </div>
    )
}

export default AddressBook;