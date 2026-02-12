import { FC, useEffect, useRef, useState } from "react";
import { RowElement } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { useVirtualizer } from "@/lib/virtual";
import { Accordion } from "@/components/shadcn/accordion";
import Row from "./Rows";
import { LayoutGroup, motion } from "framer-motion";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import useWallet from "@/hooks/useWallet";
import ConnectWalletButton from "@/components/Common/ConnectWalletButton";
import clsx from "clsx";
import RouteSearch from "./RouteSearch";
import NavigatableList from "@/components/NavigatableList";
import { useSelectorState } from "@/components/Select/Selector/Index";

type ContentProps = {
    onSelect: (route: NetworkRoute, token: NetworkRouteToken) => Promise<void> | void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    rowElements: RowElement[];
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    direction: SwapDirection;
    partialPublished?: boolean;
}

export const Content: FC<ContentProps> = (props) => {
    const [isItemsScrolling, setIsItemsScrolling] = useState(false);

    return <>
        <RouteSearch searchQuery={props.searchQuery} setSearchQuery={props.setSearchQuery} shouldFocus={true} direction={props.direction} />
        <Items {...props} isScrolling={isItemsScrolling} setIsScrolling={setIsItemsScrolling} />
    </>
}

const Items: FC<ContentProps & { isScrolling: boolean; setIsScrolling: (isScrolling: boolean) => void; }> = ({ searchQuery, setSearchQuery, rowElements, selectedToken, selectedRoute, direction, onSelect, isScrolling, setIsScrolling }) => {
    const parentRef = useRef<HTMLDivElement>(null)
    const [openValues, setOpenValues] = useState<string[]>(selectedRoute ? [selectedRoute] : [])
    const { wallets } = useWallet()
    const { shouldFocus } = useSelectorState();

    const scrollTimeout = useRef<any>(null);

    const handleScroll = () => {
        setIsScrolling(true);

        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

        scrollTimeout.current = setTimeout(() => {
            setIsScrolling(false);
        }, 1000);
    };

    useEffect(() => {
        return () => clearTimeout(scrollTimeout.current as any);
    }, []);

    const toggleAccordionItem = (value: string) => {
        setOpenValues((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        )
    }

    const virtualizer = useVirtualizer({
        count: rowElements.length,
        estimateSize: (index) => {
            const item = rowElements[index];
            const key = (item as any)?.route?.name || (item as any)?.symbol;
            const isOpen = openValues.includes(key);
            // Better size estimation based on open state
            if (isOpen && (item.type === 'network' || item.type === 'grouped_token')) {
                const tokenCount = item.type === 'network'
                    ? item.route.tokens.length
                    : item.items.length;
                // Base header (52) + tokens (each ~52px) + padding
                return 52 + (tokenCount * 52) + 20;
            }
            return 52;
        },
        getScrollElement: () => parentRef.current,
        overscan: 15
    })

    useEffect(() => {
        virtualizer.measure();
    }, [openValues])

    const items = virtualizer.getVirtualItems()

    useEffect(() => {
        return () => setSearchQuery('')
    }, [])

    return <NavigatableList
        enabled={shouldFocus}
        onReset={searchQuery ? () => { } : undefined}
    >
        <LayoutGroup>
            <motion.div
                layoutScroll
                onScroll={handleScroll}
                className={clsx(
                    "select-text in-has-[.hide-main-scrollbar]:overflow-y-hidden overflow-y-auto overflow-x-hidden scrollbar:w-1! scrollbar:h-1! pr-0.5 scrollbar-thumb:bg-transparent h-full",
                    { "styled-scroll!": isScrolling }
                )}
                ref={parentRef}
            >
                {
                    wallets.length === 0 && direction === 'from' && !searchQuery &&
                    <ConnectWalletButton
                        descriptionText="Connect your wallet to browse your assets and choose easier"
                        className="w-full my-2.5"
                    />
                }
                <div className="relative">
                    <Accordion type="multiple" value={openValues}>
                        <div>
                            <div
                                style={{
                                    height: virtualizer.getTotalSize(),
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                <div className="sticky top-0 z-50" id="sticky_accordion_header" />
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${items[0]?.start ? (items[0]?.start - 0) : 0}px)`,
                                    }}>
                                    {items.map((virtualRow) => {
                                        const data = rowElements?.[virtualRow.index]
                                        const key = ((data as any)?.route as any)?.name || virtualRow.key;
                                        return <div
                                            className="py-1 box-border w-full overflow-hidden select-none"
                                            key={key}
                                            data-index={virtualRow.index}
                                            ref={virtualizer.measureElement}>
                                            <Row
                                                index={virtualRow.index}
                                                scrollContainerRef={parentRef}
                                                openValues={openValues}
                                                onSelect={onSelect}
                                                direction={direction}
                                                item={data}
                                                selectedRoute={selectedRoute}
                                                selectedToken={selectedToken}
                                                searchQuery={searchQuery}
                                                toggleContent={toggleAccordionItem}
                                            />
                                        </div>
                                    })}
                                </div>
                            </div>
                        </div>
                    </Accordion>
                </div>
            </motion.div>
        </LayoutGroup>
    </NavigatableList>
}
