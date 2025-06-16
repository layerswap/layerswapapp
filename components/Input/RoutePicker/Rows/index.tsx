import { RefObject } from "react";
import { RowElement } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { CurrencySelectItemDisplay } from "../Routes";
import { CollapsibleRow } from "./CollapsibleRow";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import RouteTokenSwitch from "../RouteTokenSwitch";
import clsx from "clsx";

type Props = {
    item: RowElement;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    direction: SwapDirection;
    toggleContent: (itemName: string) => void;
    onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
    openValues: string[];
    scrollContainerRef: RefObject<HTMLDivElement>;
    allbalancesLoaded: boolean;
    showTokens: boolean;
    setShowTokens: (val: boolean) => void;
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
    showTokens,
    setShowTokens,
}: Props) {
    if (item.type === "network" || item.type === "grouped_token") {
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
    }

    if (item.type === "network_token" || item.type === "top_token") {
        const token = item.route.token;
        const route = item.route.route;
        const isSelected = selectedRoute === route.name && selectedToken === token.symbol;

        return (
            <div className={clsx("cursor-pointer hover:bg-secondary-300 outline-none disabled:cursor-not-allowed",
                {
                    "bg-secondary-300": isSelected,
                    "pl-5": item.type === "top_token",
                }
            )} onClick={() => onSelect(route, token)} >
                <CurrencySelectItemDisplay
                    allbalancesLoaded={allbalancesLoaded}
                    item={token}
                    selected={isSelected}
                    route={route}
                    direction={direction}
                />
            </div>
        );
    }

    if (item.type === "group_title") {
        return (
            <div className="text-primary-text-placeholder text-base font-medium leading-5 mb-2 pl-3 sticky top-0 z-50 flex items-center" style={{ position: "sticky", top: 0, transform: "none" }} >
                {item.text}
                {item.text.toLowerCase().includes("all") && (
                    <div className="ml-auto">
                        <RouteTokenSwitch showTokens={showTokens} setShowTokens={setShowTokens} />
                    </div>
                )}
            </div>
        );
    }

    return null;
}