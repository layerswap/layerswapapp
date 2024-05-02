import { AddressBookItem } from "../../../lib/layerSwapApiClient";
import { Check } from "lucide-react";
import shortenAddress from "../../utils/ShortenAddress";
import { AddressGroup } from "../../../stores/addressBookStore";
import { groupBy } from "../../utils/groupBy";
import { CommandGroup, CommandItem, CommandList, CommandWrapper } from "../../shadcn/command";
import AddressIcon from "../../AddressIcon";
import { addressFormat } from "../../../lib/address/formatter";
import { RouteNetwork } from "../../../Models/Network";

const RecentlyUsedAddresses = ({ address_book, destination, destination_address, onSelect }: { address_book: AddressBookItem[] | undefined, destination: RouteNetwork | undefined, destination_address: string | undefined, onSelect: (address: string) => void }) => {

    if (!address_book) return

    const grouppedByDate = groupBy(address_book, ({ date }) => date)
    const grouppedByDateArray = Object.keys(grouppedByDate).map(a => ({
        date: a, values: grouppedByDate[a]?.map(g => ({
            address: g.address,
            group: AddressGroup.RecentlyUsed,
            networks: g.networks,
            exchanges: g.exchanges
        }))
    }))

    return (
        <div className="text-left">
            <CommandWrapper>
                <CommandList className="max-h-[400px]">
                    {grouppedByDateArray.map((group) => {
                        const difference_in_days = Math.round(Math.abs(((new Date()).getTime() - new Date(group.date).getTime()) / (1000 * 3600 * 24)))

                        return (
                            <CommandGroup
                                key={group.date}
                                heading={
                                    (difference_in_days === 0 ?
                                        <>Used today</>
                                        :
                                        (difference_in_days && difference_in_days > 1 ?
                                            <>Used {difference_in_days} days ago</>
                                            : <>Used yesterday</>))
                                }
                                className="[&_[cmdk-group-heading]]:!pb-1 [&_[cmdk-group-heading]]:!px-0 !py-0 !px-0 mt-2 overflow-y-auto"
                            >
                                <div className="bg-secondary-800 overflow-hidden rounded-lg divide-y divide-secondary-600">
                                    {group.values?.map(item => {

                                        return (
                                            <CommandItem value={item.address} key={item.address} onSelect={onSelect} className={`!bg-transparent !px-3 hover:!bg-secondary-700 transition duration-200 ${addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) && '!bg-secondary-700'}`}>
                                                <div className={`flex items-center justify-between w-full`}>
                                                    <div className={`space-x-2 flex text-sm items-center`}>
                                                        <div className='flex bg-secondary-400 text-primary-text flex-row items-left rounded-md p-2'>
                                                            <AddressIcon address={item.address} size={20} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="block text-sm font-medium">
                                                                {shortenAddress(item.address)}
                                                            </div>
                                                            <div className="text-gray-500">

                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex h-6 items-center px-1">
                                                        {
                                                            addressFormat(item.address, destination!) === addressFormat(destination_address!, destination!) &&
                                                            <Check />
                                                        }
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        )
                                    })}

                                </div>
                            </CommandGroup>
                        )
                    })}
                </CommandList>
            </CommandWrapper>
        </div>
    )
}

export default RecentlyUsedAddresses