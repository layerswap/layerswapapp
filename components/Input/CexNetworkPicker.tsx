import { useFormikContext } from "formik";
import { FC, useCallback } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { Network } from "../../Models/Network";
import { Selector, SelectorContent, SelectorTrigger } from "../Select/CommandNew/Index";
import { ChevronDown, ChevronRight, PlusIcon, Search } from "lucide-react";
import { CommandEmpty, CommandInput, CommandItem, CommandList, CommandWrapper } from "../shadcn/command";
import SpinIcon from "../icons/spinIcon";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { ExchangeToken } from "../../Models/Exchange";
import React from "react";
import { RouteToken } from "../../Models/Route";
import useExchangeNetworks from "../../hooks/useExchangeNetworks";
import { SelectItem } from "../Select/CommandNew/SelectItem/Index";
import Address from "./Address";
import { Partner } from "../../Models/Partner";
import AddressIcon from "../AddressIcon";
import { ExtendedAddress } from "./Address/AddressPicker/AddressWithIcon";


const CexNetworkPicker: FC<{ direction: SwapDirection, partner: Partner | undefined }> = ({ direction, partner }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { isDesktop } = useWindowDimensions();
    const { isLoading, networks } = useExchangeNetworks({ direction, values })

    const currencyFieldName = direction === 'from' ? 'fromCurrency' : 'toCurrency';

    const selectedNetwork = values[direction]
    const selectedToken = values[currencyFieldName]

    const handleSelect = useCallback(async (network: Network, token: RouteToken) => {
        setFieldValue(currencyFieldName, token, true)
        setFieldValue(direction, network, true)
    }, [currencyFieldName, direction, values])

    const header = direction === 'from' ? 'Withdrawal network' : 'Deposit details'

    return (
        <div className="p-3 rounded-lg bg-secondary-500  space-y-2">
            <label className="font-semibold flex justify-between text-secondary-text text-xs">
                <div className="flex space-x-1">
                    <span>{header}</span>
                </div>
            </label>
            <div className="relative">
                <Selector>
                    <SelectorTrigger disabled={false}>
                        <SelectedNetworkDisplay network={selectedNetwork} token={selectedToken} placeholder="Source" />
                        <span className="ml-3 right-0 flex items-center pr-2 pointer-events-none text-primary-text">
                            <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
                        </span>
                    </SelectorTrigger>
                    <SelectorContent isLoading={isLoading} modalHeight="full" searchHint="Search">
                        {({ closeModal }) => (
                            <CommandWrapper>
                                <CommandInput autoFocus={isDesktop} placeholder="Search">
                                    <div className="pl-2">
                                        <Search className="w-6 h-6 text-secondary-text" />
                                    </div>
                                </CommandInput>
                                {isLoading ? (
                                    <div className="flex justify-center h-full items-center">
                                        <SpinIcon className="animate-spin h-5 w-5" />
                                    </div>
                                ) : (
                                    <CommandList>
                                        <CommandEmpty>No results found.</CommandEmpty>
                                        {
                                            networks?.map((data, index) => {
                                                const { network, token } = data
                                                return (
                                                    //// Wrap accordion with disabled command itme to filter out in search. (when accordion is oppen it will ocupy some space)
                                                    <ExchangeNetwork
                                                        key={`${network.name}-${token.symbol}`}
                                                        token={token}
                                                        route={network}
                                                        direction={direction}
                                                        divider={index + 1 < Number(networks?.length)}
                                                        onSelect={(n, t) => { handleSelect(n, t); closeModal() }}
                                                    />
                                                )
                                            })
                                        }
                                    </CommandList>
                                )}
                            </CommandWrapper>
                        )}
                    </SelectorContent>
                </Selector>
            </div>
            {
                direction === "to" && values.to &&
                <div className="flex items-center col-span-6">
                    <Address partner={partner} >{
                        ({ disabled, addressItem }) => <>
                            {
                                addressItem ? <>
                                    <AddressButton addressItem={addressItem} network={selectedNetwork} disabled={disabled} />
                                </>
                                    : <div className=" justify-center w-full pl-3 pr-2 py-2 bg-secondary-400 items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 ">
                                        <PlusIcon className="stroke-1" /> <span>Destination Address</span>
                                    </div>
                            }
                        </>
                    }</Address>
                </div>
            }
        </div >

    )
}

type ExchangeNetworkProps = {
    token: RouteToken;
    route: Network;
    direction: SwapDirection;
    divider: boolean;
    onSelect: (route: Network, token: RouteToken) => void;
}

const ExchangeNetwork = (props: ExchangeNetworkProps) => {
    const { route, token, direction, onSelect, divider } = props
    const tokenItemRef = React.useRef<HTMLDivElement>(null);

    return <CommandItem
        className="aria-selected:bg-secondary-400 aria-selected:text-primary-text rounded-lg bg-secondary-500 hover:bg-secondary-400 relative mt-1.5"
        value={`${route.display_name} ${token.symbol} ##`}
        key={token.symbol}
        onSelect={() => { onSelect(route, token) }}
        ref={tokenItemRef}
    >
        <SelectItem>
            <SelectItem.Logo imgSrc={route.logo} altText={`${route.display_name} logo`} />
            <SelectItem.DetailedTitle title={route.display_name} secondary={token.symbol} className={`py-3 ${divider ? 'border-t border-secondary-700' : ''}`} />
        </SelectItem>
    </CommandItem>
}

type SelectedNetworkDisplayProps = {
    network?: Network;
    token?: ExchangeToken;
    placeholder: string;
}

export const SelectedNetworkDisplay = (props: SelectedNetworkDisplayProps) => {
    const { network, token, placeholder } = props

    if (!network || !token) return <span className="block font-medium text-primary-text-placeholder flex-auto items-center">{placeholder}</span>

    return <SelectItem className="pl-0">
        <SelectItem.Logo imgSrc={network.logo} altText={`${network.display_name} logo`} />
        <SelectItem.DetailedTitle title={network.display_name} secondary={token.symbol} />
    </SelectItem>

    // <span className='flex grow text-left items-center text-xs md:text-base'>
    //     {
    //         token?.logo && network?.logo &&
    //         <div className='inline-flex items-center relative'>
    //             <ImageWithFallback
    //                 src={network.logo}
    //                 alt="Token Logo"
    //                 height="36"
    //                 width="36"
    //                 loading="eager"
    //                 fetchPriority='high'
    //                 className="rounded-full object-contain"
    //             />
    //             <ImageWithFallback
    //                 src={token.logo}
    //                 alt="Route Logo"
    //                 height="20"
    //                 width="20"
    //                 loading="eager"
    //                 fetchPriority='high'
    //                 className='h-5 w-5 absolute -right-1.5 -bottom-1.5 object-contain rounded-md border-2 border-secondary-800'
    //             />
    //         </div>
    //     }

    //     {token && network ?
    //         <span className="ml-3 flex font-medium flex-auto space-x-1 text-primary-buttonTextColor items-center">
    //             <span>{network?.display_name}</span><span className="text-secondary-text font-light"> - {token?.symbol}</span>
    //         </span>
    //         :
    //         <span className="block font-medium text-primary-text-placeholder flex-auto items-center">
    //             {placeholder}
    //         </span>
    //     }
    // </span>
}

const AddressButton = ({ addressItem, network, disabled }) => {

    return <div className="justify-between w-full pl-3 pr-2 py-2 bg-secondary-600 items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 ">
        <div className="flex items-center gap-3">
            <div className='flex text-primary-text items-center justify-center rounded-md h-6 overflow-hidden w-6'>
                <AddressIcon className="scale-150 h-3 w-3" address={addressItem.address} size={36} />
            </div>
            <ExtendedAddress address={addressItem.address} network={network} />
        </div>
        <span className="ml-3 justify-self-end right-0 flex items-center pr-2 pointer-events-none  text-primary-text">
            {!disabled && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
        </span>
    </div>
}

export default CexNetworkPicker