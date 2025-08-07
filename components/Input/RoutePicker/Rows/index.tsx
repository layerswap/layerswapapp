import { RefObject } from "react";
import { RowElement } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { CurrencySelectItemDisplay } from "../Routes";
import { CollapsibleRow } from "./CollapsibleRow";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import RouteTokenSwitch from "../RouteTokenSwitch";
import clsx from "clsx";
import { SelectItem } from "@/components/Select/CommandNew/SelectItem/Index";

type Props = {
    item: RowElement;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    direction: SwapDirection;
    toggleContent: (itemName: string) => void;
    onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
    openValues: string[];
    scrollContainerRef: RefObject<HTMLDivElement>;
    allbalancesLoaded?: boolean;
};

export default function Row({
    item,
    direction,
    selectedRoute,
    selectedToken,
    toggleContent,
    onSelect,
    openValues,
    allbalancesLoaded,
    scrollContainerRef,
}: Props) {

    switch (item.type) {
        case "network":
        case "grouped_token":
            return (
                <CollapsibleRow
                    item={item}
                    direction={direction}
                    selectedRoute={selectedRoute}
                    selectedToken={selectedToken}
                    toggleContent={toggleContent}
                    onSelect={onSelect}
                    openValues={openValues}
                    scrollContainerRef={scrollContainerRef}
                    allbalancesLoaded={allbalancesLoaded}
                />
            );
        case "network_token":
        case "suggested_token": {
            const token = item.route.token;
            const route = item.route.route;
            const isSelected = selectedRoute === route.name && selectedToken === token.symbol;

            return (
                <div className={clsx("cursor-pointer hover:bg-secondary-300 outline-none disabled:cursor-not-allowed rounded-lg", { "bg-secondary-300": isSelected })} onClick={() => onSelect(route, token)} >
                    <CurrencySelectItemDisplay
                        allbalancesLoaded={allbalancesLoaded}
                        item={token}
                        selected={isSelected}
                        route={route}
                        direction={direction}
                        type={item.type}
                    />
                </div>
            );
        }
        case "group_title":
            return (
                <div className="text-primary-text-placeholder text-base font-medium leading-5 pl-1 sticky top-0 z-50 flex items-baseline" style={{ position: "sticky", top: 0, transform: "none" }} >
                    <p>
                        {item.text}
                    </p>
                    {
                        item.text.toLowerCase().includes("all") &&
                        <div className="relative ml-auto">
                            <RouteTokenSwitch />
                        </div>
                    }
                </div>
            );
        case "sceleton_token":
            return (
                <SelectItem className="animate-pulse">
                    <SelectItem.Logo
                        altText={`sceleton logo `}
                        className="rounded-full bg-secondary-500"
                    />
                    <SelectItem.Title className="py-2">
                        <div className="grid gap-0 leading-5 align-middle space-y-0.5 font-medium">
                            <span className="align-middle h-3.5 my-1 w-12 bg-secondary-500 rounded-sm" />
                            <div className="flex items-center space-x-1 align-middle" >
                                <div className="w-2 h-2 my-1 bg-secondary-500 rounded-[4px]" />
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