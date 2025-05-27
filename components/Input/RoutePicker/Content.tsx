import { useCallback, useRef, useState } from "react";
import { Route, RouteToken, RowElement } from "../../../Models/Route";
import useWindowDimensions from "../../../hooks/useWindowDimensions";
import { SwapDirection } from "../../DTOs/SwapFormValues";
import { useVirtualizer } from "../../../lib/virtual";
import { Search } from "lucide-react";
import { Accordion } from "../../shadcn/accordion";
import Row from "./Rows";


type ContentProps = {
    onSelect: (route: Route, token: RouteToken) => Promise<void> | void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    rowElements: RowElement[];
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    direction: SwapDirection;
}
export const Content = ({ searchQuery, setSearchQuery, rowElements, selectedToken, selectedRoute, direction, onSelect }: ContentProps) => {
    const parentRef = useRef<HTMLDivElement>(null)
    const [openValues, setOpenValues] = useState<string[]>(selectedRoute ? [selectedRoute] : [])

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

    return <div className="py-3 overflow-y-auto flex flex-col h-full z-40  pb-6" >
        <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <div className="select-text in-has-[.hide-main-scrollbar]:overflow-y-hidden overflow-y-auto overflow-x-hidden styled-scroll px-3 h-full" ref={parentRef}>
            <div className="relative"  >
                <Accordion type="multiple" value={openValues}>
                    <div>
                        <div
                            style={{
                                height: virtualizer.getTotalSize(),
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            <div className="sticky top-0 z-50" id="sticky_accordion_header">
                            </div>
                            <div
                                className="space-y-2"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${items[0]?.start ? (items[0]?.start - 0) : 0}px)`,
                                }}>

                                {items.map((virtualRow) => {
                                    const data = rowElements?.[virtualRow.index]
                                    return <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                    >
                                        <Row
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
        </div>
    </div >
}

const SearchComponent = ({ searchQuery, setSearchQuery }: { searchQuery: string, setSearchQuery: (query: string) => void }) => {
    const { isDesktop } = useWindowDimensions();

    return <div className="flex items-center bg-secondary-500 rounded-lg px-2 mb-2 mr-4 ml-3">
        <Search className="w-6 h-6 mr-2 text-primary-text-placeholder" />
        <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={isDesktop}
            placeholder="Search"
            autoComplete="off"
            className="placeholder:text-primary-text-placeholder border-0 border-b-0 border-primary-text bg-secondary-500 focus:border-primary-text appearance-none block py-2.5 px-0 w-full h-11 text-base outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
        />
    </div>
}