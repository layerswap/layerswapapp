import { RefObject } from "react";
import { Route, RouteToken, RowElement } from "../../../../Models/Route"
import { SwapDirection } from "../../../DTOs/SwapFormValues";
import { CurrencySelectItemDisplay } from "../Routes";
import { NetworkCexRow } from "./NetworkCexRow"

type Props = {
    item: RowElement;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    direction: SwapDirection;
    toggleContent: (itemName: string) => void;
    onSelect: (route: Route, token: RouteToken) => void
    openValues: string[]
    scrollContainerRef: RefObject<HTMLDivElement>
}
export default function Row({ item, direction, selectedRoute, selectedToken, toggleContent, onSelect, openValues, scrollContainerRef }: Props) {
    if (item.type == "network" || item.type == "exchange") {
        const route = item.route
        return <NetworkCexRow
            scrollContainerRef={scrollContainerRef}
            key={route.name}
            route={route}
            onSelect={onSelect}
            direction={direction}
            selectedRoute={selectedRoute}
            selectedToken={selectedToken}
            toggleContent={toggleContent}
            openValues={openValues}
        />
    }
    if (item.type == "network_token" || item.type == "exchange_token") {
        const token = item.route.token
        const route = item.route.route
        const isSelected = selectedRoute === route.name && selectedToken === token.symbol
        return <div
            className={`pl-5 cursor-pointer hover:bg-secondary-300 ${isSelected ? "bg-secondary-300" : ""} outline-none disabled:cursor-not-allowed`}
            onClick={() => onSelect(route, token)}
        ><CurrencySelectItemDisplay
                item={token}
                selected={false}
                route={route}
                direction={direction}
            />
        </div>
    }
    if (item.type == "group_title")
        return <div className="text-primary-text-placeholder text-base font-medium leading-5 mb-2 px-3 sticky top-0 z-50" style={{ position: 'sticky', top: 0, transform: 'none' }}>{item.text}</div>
}