import { useFormikContext } from "formik";
import { FC, useCallback } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { Network } from "../../Models/Network";
import { Selector, SelectorContent, SelectorTrigger } from "../Select/CommandNew/Index";
import { ChevronDown, Search } from "lucide-react";
import { CommandEmpty, CommandInput, CommandItem, CommandList, CommandWrapper } from "../shadcn/command";
import SpinIcon from "../icons/spinIcon";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { Exchange, ExchangeToken } from "../../Models/Exchange";
import React from "react";
import { ExchangeElement, RouteToken } from "../../Models/Route";
import { SelectItem } from "../Select/CommandNew/SelectItem/Index";
import { Partner } from "../../Models/Partner";
import useFormRoutes from "@/hooks/useFormRoutes";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { SelectedRoutePlaceholder } from "./RoutePicker/Routes";

const CexNetworkPicker: FC<{ direction: SwapDirection, partner?: Partner | undefined }> = ({ direction, partner }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { isDesktop } = useWindowDimensions();
    const { exchangeElements, exchangesRoutesLoading: isLoading } = useFormRoutes({ direction, values }, "")

    const handleSelect = useCallback(async (network: Exchange) => {
        setFieldValue(direction, network, true)
    }, [direction, values])

    return (
        <div className="rounded-lg space-y-2">
            <div className="relative">
                <Selector>
                    <SelectorTrigger disabled={false}>
                        <SelectedNetworkDisplay network={values.fromExchange} placeholder="Source" />
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
                                    <CommandList className="select-text in-has-[.hide-main-scrollbar]:overflow-y-hidden overflow-y-auto overflow-x-hidden styled-scroll pr-3 h-full">
                                        <CommandEmpty>No results found.</CommandEmpty>
                                        {
                                            exchangeElements?.flatMap((item, index) => {
                                                if (item.type === 'exchange') {
                                                    const exchange = item as ExchangeElement;
                                                    const { route } = exchange;

                                                    return (
                                                        <ExchangeNetwork
                                                            key={`${route.name}-${index}`}
                                                            route={route}
                                                            direction={direction}
                                                            onSelect={(n) => {
                                                                handleSelect(n);
                                                                closeModal();
                                                            }}
                                                        />
                                                    )
                                                }
                                                return [];
                                            })
                                        }
                                    </CommandList>
                                )}
                            </CommandWrapper>
                        )}
                    </SelectorContent>
                </Selector>
            </div>
        </div>
    )
}

type ExchangeNetworkProps = {
    route: Exchange;
    direction: SwapDirection;
    onSelect: (route: Exchange) => void;
}

const ExchangeNetwork = (props: ExchangeNetworkProps) => {
    const { route, onSelect } = props
    const tokenItemRef = React.useRef<HTMLDivElement>(null);

    return <CommandItem
        className="aria-selected:bg-secondary-400 aria-selected:text-primary-text rounded-lg bg-secondary-500 hover:bg-secondary-400 relative mt-1.5"
        value={`${route.display_name} ##`}
        key={route.name}
        onSelect={() => { onSelect(route) }}
        ref={tokenItemRef}
    >
        <SelectItem>
            <SelectItem.Logo imgSrc={route.logo} altText={`${route.display_name} logo`} />
            <SelectItem.Title className="py-3">{route.display_name}</SelectItem.Title>
        </SelectItem>
    </CommandItem>
}

type SelectedNetworkDisplayProps = {
    network?: Exchange;
    token?: ExchangeToken;
    placeholder: string;
}

export const SelectedNetworkDisplay = (props: SelectedNetworkDisplayProps) => {
    const { network, placeholder } = props

    return (
        <span className="flex grow text-left items-center text-xs md:text-base relative">
            {network ? (
                <>
                    <div className="inline-flex items-center relative shrink-0">
                        <ImageWithFallback
                            src={network.logo}
                            alt="Route Logo"
                            height="12"
                            width="12"
                            loading="eager"
                            fetchPriority="high"
                            className="h-3.5 w-3.5 absolute -right-1.5 -bottom-1.5 object-contain rounded border-1 border-secondary-300"
                        />
                    </div>
                    <span className="ml-3 flex flex-col font-medium text-primary-buttonTextColor overflow-hidden min-w-0 max-w-3/5">
                        <span className="text-secondary-text font-normal text-sm leading-4 truncate whitespace-nowrap max-w-[60px] sm:max-w-[100px]">
                            {network.display_name}
                        </span>
                    </span>
                </>
            ) : (
                <SelectedRoutePlaceholder placeholder={placeholder} />
            )}
            <span className="absolute right-0 pr-2 pl-1 pointer-events-none text-primary-text">
                <ChevronDown className="h-3.5 w-3.5 text-secondary-text" aria-hidden="true" />
            </span>
        </span>
    )
}

export default CexNetworkPicker