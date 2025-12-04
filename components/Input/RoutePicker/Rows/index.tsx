import { RefObject, useEffect, useRef } from "react";
import { RowElement } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { CurrencySelectItemDisplay } from "../Routes";
import { CollapsibleRow } from "./CollapsibleRow";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import clsx from "clsx";
import { SelectItem } from "@/components/Select/Selector/SelectItem";
import TitleRow from "./TitleRow";

type Props = {
    item: RowElement;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    searchQuery: string
    direction: SwapDirection;
    toggleContent: (itemName: string) => void;
    onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
    openValues: string[];
    scrollContainerRef: RefObject<HTMLDivElement>;
    index: number;
    focusedIndex: string | null;
    navigableIndex: number;
    onHover: (index: string) => void;
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
    focusedIndex,
    navigableIndex,
    onHover,
}: Props) {
    const rowRef = useRef<HTMLDivElement>(null);
    const isFocused = focusedIndex !== null && focusedIndex === navigableIndex.toString() && focusedIndex.indexOf('.') === -1;

    useEffect(() => {
        if (isFocused && rowRef.current) {
            rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [isFocused]);

    switch (item.type) {
        case "network":
        case "grouped_token":
            return (
                <CollapsibleRow
                    ref={rowRef}
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
                    focusedIndex={focusedIndex}
                    navigableIndex={navigableIndex}
                    isFocused={isFocused}
                    onHover={onHover}
                />
            );
        case "network_token":
        case "suggested_token": {
            const token = item.route.token;
            const route = item.route.route;
            const isSelected = selectedRoute === route.name && selectedToken === token.symbol;

            return (
                <div
                    ref={rowRef}
                    data-nav-index={navigableIndex >= 0 ? navigableIndex.toString() : undefined}
                    className={clsx(
                        "cursor-pointer outline-none disabled:cursor-not-allowed rounded-xl",
                        !isFocused && "hover:bg-secondary-500",
                        isFocused && "bg-secondary-500"
                    )}
                    onClick={() => onSelect(route, token)}
                    onMouseEnter={() => navigableIndex >= 0 && onHover(navigableIndex.toString())}
                >
                    <CurrencySelectItemDisplay
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
