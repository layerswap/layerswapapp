import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { NetworkBalance } from "@/Models/Balance";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useVirtualizer } from "@/lib/virtual";
import { extractTokenElementsAsSuggested, sortSuggestedTokenElements } from "@/helpers/routeUtils";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useSelectorState } from "@/components/Select/Selector/Index";
import NavigatableList, { NavigatableItem } from "@/components/NavigatableList";
import useWallet from "@/hooks/useWallet";
import ConnectWalletButton from "@/components/Common/ConnectWalletButton";
import { CurrencySelectItemDisplay } from "./Routes";
import { SelectItem } from "@/components/Select/Selector/SelectItem";
import clsx from "clsx";

type Props = {
    routes: NetworkRoute[];
    balances: Record<string, NetworkBalance> | null;
    balancesLoading: boolean;
    direction: SwapDirection;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    onSelect: (route: NetworkRoute, token: NetworkRouteToken) => Promise<void> | void;
    hideBalances?: boolean;
};

const ROW_HEIGHT = 52;
const SKELETON_COUNT = 4;

export const FlatContent: FC<Props> = ({
    routes,
    balances,
    balancesLoading,
    direction,
    selectedRoute,
    selectedToken,
    onSelect,
    hideBalances,
}) => {
    const parentRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recentRoutes = useRecentNetworksStore(s => s.recentRoutes);
    const { wallets, providers } = useWallet();
    const { shouldFocus } = useSelectorState();

    const items = useMemo(() => {
        const flattened = extractTokenElementsAsSuggested(routes).filter(
            e => e.route.token.status === "active"
        );
        return flattened.sort(sortSuggestedTokenElements(direction, balances, recentRoutes));
    }, [routes, balances, direction, recentRoutes]);

    const showSkeletons = balancesLoading && items.length === 0 && direction === "from";

    const virtualCount = showSkeletons ? SKELETON_COUNT : items.length;

    const virtualizer = useVirtualizer({
        count: virtualCount,
        estimateSize: () => ROW_HEIGHT,
        getScrollElement: () => parentRef.current,
        overscan: 8,
    });

    const handleScroll = useCallback(() => {
        setIsScrolling(true);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => setIsScrolling(false), 1000);
    }, []); // only refs and state setters — stable

    useEffect(() => {
        return () => {
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, []);

    const isProvidersReady = providers.every(p => p.ready);
    const virtualItems = virtualizer.getVirtualItems();

    return (
        <NavigatableList enabled={shouldFocus}>
            <div
                ref={parentRef}
                onScroll={handleScroll}
                className={clsx(
                    "select-text overflow-y-auto overflow-x-hidden scrollbar:w-1! scrollbar:h-1! pr-0.5 scrollbar-thumb:bg-transparent h-full",
                    { "styled-scroll!": isScrolling }
                )}
            >
                {wallets.length === 0 && direction === "from" && (
                    <ConnectWalletButton
                        descriptionText="Connect your wallet to browse your assets and choose easier"
                        className="w-full my-2.5"
                        disabled={!isProvidersReady}
                    />
                )}
                <div
                    style={{
                        height: virtualizer.getTotalSize(),
                        width: "100%",
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
                        }}
                    >
                        {virtualItems.map(virtualRow => {
                            if (showSkeletons) {
                                return (
                                    <div
                                        key={`skeleton-${virtualRow.index}`}
                                        data-index={virtualRow.index}
                                        className="py-1 box-border w-full overflow-hidden select-none"
                                    >
                                        <TokenSkeletonRow />
                                    </div>
                                );
                            }

                            const data = items[virtualRow.index];
                            if (!data) return null;
                            const token = data.route.token;
                            const route = data.route.route;
                            const isSelected =
                                selectedRoute === route.name && selectedToken === token.symbol;

                            return (
                                <div
                                    key={`${route.name}-${token.symbol}`}
                                    data-index={virtualRow.index}
                                    className="py-1 box-border w-full overflow-hidden select-none"
                                >
                                    <NavigatableItem
                                        index={virtualRow.index}
                                        onClick={() => onSelect(route, token)}
                                        className="group/row cursor-pointer hover:bg-secondary-500 has-[*[data-tooltip-open=true]]:bg-secondary-500 outline-none disabled:cursor-not-allowed rounded-xl"
                                        focusedClassName="bg-secondary-500"
                                    >
                                        <CurrencySelectItemDisplay
                                            item={token}
                                            selected={isSelected}
                                            route={route}
                                            direction={direction}
                                            type="suggested_token"
                                            hideBalances={hideBalances}
                                        />
                                    </NavigatableItem>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </NavigatableList>
    );
};

const TokenSkeletonRow: FC = () => (
    <SelectItem className="animate-pulse">
        <SelectItem.Logo altText="skeleton logo" className="rounded-full bg-secondary-500" />
        <SelectItem.Title>
            <div className="grid gap-0 leading-5 align-middle space-y-0.5 font-medium">
                <span className="align-middle h-3.5 my-1 w-12 bg-secondary-500 rounded-sm" />
                <div className="flex items-center space-x-1 align-middle">
                    <div className="w-2 h-2 my-1 bg-secondary-500 rounded-sm" />
                    <span className="bg-secondary-500 text-xs whitespace-nowrap h-2 my-1 w-20 rounded-sm" />
                </div>
            </div>
            <span className="text-sm text-secondary-text text-right my-auto leading-4 font-medium">
                <div className="text-primary-text text-lg leading-[22px] bg-secondary-500 h-3 my-1 w-16 ml-auto rounded-sm" />
                <div className="text-xs leading-4 bg-secondary-500 h-2 my-1 w-10 ml-auto rounded-sm" />
            </span>
        </SelectItem.Title>
    </SelectItem>
);
