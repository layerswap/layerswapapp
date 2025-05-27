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
    setOnValueChange: (callback: (v: string[]) => void) => void
}
export default function Row({ item, direction, selectedRoute, selectedToken, toggleContent, onSelect, openValues, scrollContainerRef, setOnValueChange }: Props) {
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
            setOnValueChange={setOnValueChange}
        />
    }
    if (item.type == "network_token" || item.type == "exchange_token") {
        const token = item.route.token
        const route = item.route.route
        return <CurrencySelectItemDisplay
            item={token}
            selected={false}
            route={route}
            direction={direction}
        />
    }
    if (item.type == "group_title")
        return <div className="text-primary-text-placeholder text-base font-medium leading-5 mb-2 px-3 sticky top-0 z-50" style={{ position: 'sticky', top: 0, transform: 'none' }}>{item.text}</div>
}