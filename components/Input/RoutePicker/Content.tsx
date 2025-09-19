import { useEffect, useRef, useState } from "react";
import { RowElement } from "../../../Models/Route";
import { SwapDirection } from "../../DTOs/SwapFormValues";
import { useVirtualizer } from "../../../lib/virtual";
import { Accordion } from "../../shadcn/accordion";
import Row from "./Rows";
import { LayoutGroup, motion } from "framer-motion";
import { NetworkRoute, NetworkRouteToken } from "../../../Models/Network";
import { useSelectorState } from "../../Select/Selector/Index";
import useWallet from "@/hooks/useWallet";
import ConnectWalletButton from "../../Common/ConnectWalletButton";
import { SearchComponent } from "../Search";

type ContentProps = {
    onSelect: (route: NetworkRoute, token: NetworkRouteToken) => Promise<void> | void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    rowElements: RowElement[];
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    direction: SwapDirection;
    allbalancesLoaded?: boolean;
}
export const Content = ({ searchQuery, setSearchQuery, rowElements, selectedToken, selectedRoute, direction, onSelect, allbalancesLoaded }: ContentProps) => {
    const parentRef = useRef<HTMLDivElement>(null)
    const [openValues, setOpenValues] = useState<string[]>(selectedRoute ? [selectedRoute] : [])
    const { shouldFocus } = useSelectorState();
    const { wallets } = useWallet()

    const toggleAccordionItem = (value: string) => {
        setOpenValues((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        )
    }
    const virtualizer = useVirtualizer({
        count: rowElements.length,
        estimateSize: () => 50,
        getScrollElement: () => parentRef.current,
        overscan: 15
    })
    const items = virtualizer.getVirtualItems()

    useEffect(() => {
        return () => setSearchQuery('')
    }, [])
    
    return <div className="overflow-y-auto flex flex-col h-full z-40 openpicker" >
        <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} isOpen={shouldFocus} />
        <LayoutGroup>
            <motion.div layoutScroll className="select-text in-has-[.hide-main-scrollbar]:overflow-y-hidden overflow-y-auto overflow-x-hidden styled-scroll pr-3 h-full" ref={parentRef}>
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
                                            className="py-1 box-border w-full overflow-hidden"
                                            key={key}
                                            data-index={virtualRow.index}
                                            ref={virtualizer.measureElement}>
                                            <Row
                                                allbalancesLoaded={allbalancesLoaded}
                                                scrollContainerRef={parentRef}
                                                openValues={openValues}
                                                onSelect={onSelect}
                                                direction={direction}
                                                item={data}
                                                selectedRoute={selectedRoute}
                                                selectedToken={selectedToken}
                                                toggleContent={toggleAccordionItem}
                                            />
                                        </div>
                                    })}
                                </div>
                            </div>
                        </div>
                    </Accordion >
                </div>
            </motion.div>
        </LayoutGroup>
    </div >
}