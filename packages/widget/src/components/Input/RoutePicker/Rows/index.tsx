import { RefObject } from "react";
import { RowElement } from "@/Models/Route";
import { CurrencySelectItemDisplay } from "../Routes";
import { CollapsibleRow } from "./CollapsibleRow";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { SelectItem } from "@/components/Select/Selector/SelectItem";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";
import TitleRow from "./TitleRow";
import { NavigatableItem } from "@/components/NavigatableList";

type Props = {
    item: RowElement;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    searchQuery: string
    direction: SwapDirection;
    toggleContent: (itemName: string) => void;
    onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
    openValues: string[];
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    index: number;
};

export default function Row({
    item,
    direction,
    selectedRoute,
    selectedToken,
    searchQuery,
    toggleContent,
    onSelect,
    openValues,
    scrollContainerRef,
    index,
}: Props) {

    switch (item.type) {
        case "network":
        case "grouped_token": {
            return (
                <CollapsibleRow
                    index={index}
                    item={item}
                    direction={direction}
                    selectedRoute={selectedRoute}
                    selectedToken={selectedToken}
                    searchQuery={searchQuery}
                    toggleContent={toggleContent}
                    onSelect={onSelect}
                    openValues={openValues}
                    scrollContainerRef={scrollContainerRef}
                />
            );
        }
        case "network_token":
        case "suggested_token": {
            const token = item.route.token;
            const route = item.route.route;
            const isSelected = selectedRoute === route.name && selectedToken === token.symbol;

            return (
                <NavigatableItem
                    index={index}
                    onClick={() => onSelect(route, token)}
                    className="group/row cursor-pointer hover:bg-secondary-500 has-[*[data-tooltip-open=true]]:bg-secondary-500 has-[*[data-tooltip-open=true]]:cursor-pointer! outline-none disabled:cursor-not-allowed rounded-xl"
                    focusedClassName="bg-secondary-500"
                >
                    <CurrencySelectItemDisplay
                        item={token}
                        selected={isSelected}
                        route={route}
                        direction={direction}
                        type={item.type}
                    />
                </NavigatableItem>
            );
        }
        case "group_title":
            return <TitleRow item={item} />
        case "sceleton_token":
            return (
                <SelectItem className="animate-pulse">
                    <SelectItem.Logo
                        altText={`sceleton logo `}
                        className="rounded-full bg-secondary-500"
                    />
                    <SelectItem.Title className="py-0.5">
                        <div className="grid gap-0 leading-5 align-middle space-y-0.5 font-medium">
                            <span className="align-middle h-3.5 my-1 w-12 bg-secondary-500 rounded-sm" />
                            <div className="flex items-center space-x-1 align-middle" >
                                <div className="w-2 h-2 my-1 bg-secondary-500 rounded-sm" />
                                <span className="bg-secondary-500 text-xs whitespace-nowrap h-2 my-1 w-20 rounded-sm" />
                            </div>
                        </div>
                        <span className="text-sm text-secondary-text text-right my-auto leading-4 font-medium">
                            <div className="text-primary-text text-lg leading-[22px] bg-secondary-500 h-3 my-1 w-16 ml-auto rounded-sm" />
                            <div className="text-xs leading-4 bg-secondary-500 h-2 my-1 w-10 ml-auto rounded-sm" />
                        </span>
                    </SelectItem.Title>
                </SelectItem >
            );
        default:
            return null
    }
}
