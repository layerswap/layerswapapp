import { RefObject } from "react";
import { RowElement, GroupedTokenElement } from "../../../../Models/Route";
import { SwapDirection } from "../../../DTOs/SwapFormValues";
import { CurrencySelectItemDisplay } from "../Routes";
import { CollapsibleRow } from "./CollapsibleRow";
import { NetworkRoute, NetworkRouteToken } from "../../../../Models/Network";

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
            <div className={`${item.type === "top_token" ? "" : "pl-5"} cursor-pointer hover:bg-secondary-300 ${isSelected ? "bg-secondary-300" : ""} outline-none disabled:cursor-not-allowed`} onClick={() => onSelect(route, token)} >
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
            <div className="text-primary-text-placeholder text-base font-medium leading-5 mb-2 px-3 sticky top-0 z-50" style={{ position: "sticky", top: 0, transform: "none" }} >
                {item.text}
            </div>
        );
    }

    return null;
}