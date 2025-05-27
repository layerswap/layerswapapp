import { RefObject, useEffect, useRef, useState } from "react";
import { Route, RouteToken } from "../../../../Models/Route";
import { ResolveCEXCurrencyOrder, ResolveCurrencyOrder } from "../../../../lib/sorting";
import { SwapDirection } from "../../../DTOs/SwapFormValues";
import { AccordionContent, AccordionItem, AccordionTrigger } from "../../../shadcn/accordion";
import { CurrencySelectItemDisplay, RouteSelectItemDisplay } from "../Routes";
import ReactPortal from "../../../Common/ReactPortal";
import { motion } from "framer-motion";

function getSortedRouteTokens(route: Route) {
    if (route.cex) {
        return route.token_groups?.sort((a, b) => ResolveCEXCurrencyOrder(a) - ResolveCEXCurrencyOrder(b))
    }
    return route.tokens?.sort((a, b) => ResolveCurrencyOrder(a) - ResolveCurrencyOrder(b))
}
type RouteElementProps = {
    route: Route,
    toggleContent: (itemName: string) => void;
    direction: SwapDirection;
    onSelect: (route: Route, token: RouteToken) => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
    openValues?: string[]
    scrollContainerRef: RefObject<HTMLDivElement>
    setOnValueChange: (callback: (v: string[]) => void) => void
}
export const NetworkCexRow = ({
    route,
    toggleContent,
    direction,
    onSelect,
    selectedRoute,
    selectedToken,
    openValues,
    scrollContainerRef,
    setOnValueChange
}: RouteElementProps) => {
    const sortedTokens = getSortedRouteTokens(route)

    const [isSticky, setSticky] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const isOpen = openValues?.some(ov => ov === route.name)

    useEffect(() => {
        if (!isOpen) {
            setSticky(false);
            return;
        }
        const container = scrollContainerRef.current;
        if (!container) return;

        const onScroll = () => {
            const headerRect = headerRef.current?.getBoundingClientRect();
            const contentRect = contentRef.current?.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const passedTop = Number(headerRect?.top) - 3 <= containerRect.top;
            const contentGone = Number(contentRect?.bottom) <= containerRect.top + (headerRect?.height || 0) * 1.5;
            setSticky(passedTop && !contentGone);
        };

        container.addEventListener('scroll', onScroll, { passive: true });
        return () => container.removeEventListener('scroll', onScroll);
    }, [isOpen, scrollContainerRef]);

    const stickyToggle = () => {
        toggleContent(route.name)
        headerRef.current?.scrollIntoView({ block: "start", inline: "start" })
    }

    return (<div>
        <AccordionItem value={route.name}>
            <div
                ref={headerRef}
                id={`${route.name}-header`}
                onClick={() => toggleContent(route.name)}
                className={`cursor-pointer bg-secondary-700 rounded-lg hover:bg-secondary-600 relative ${isSticky ? 'opacity-0' : ''}`}>
                <AccordionTrigger className={route.name === "ETHEREUM_MAINNET" ? "sticky" : ""}>
                    <RouteSelectItemDisplay
                        item={route}
                        selected={false}
                        direction={direction}
                    />
                </AccordionTrigger>
            </div>
            {
                isSticky &&
                <ReactPortal wrapperId="sticky_accordion_header" >
                    <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={stickyToggle}
                        className="cursor-pointer bg-secondary-700 hover:bg-secondary-600 relative pb-1">
                        <AccordionTrigger className={route.name === "ETHEREUM_MAINNET" ? "sticky" : ""}>
                            <RouteSelectItemDisplay
                                item={route}
                                selected={false}
                                direction={direction}
                            />
                        </AccordionTrigger>
                    </motion.div>
                </ReactPortal>
            }
            <AccordionContent className="AccordionContent mt-1" ref={contentRef}>
                <div className='has-[.token-item]:mt-1 bg-secondary-400 rounded-xl overflow-hidden'>
                    <div className="overflow-y-auto styled-scroll">
                        {sortedTokens?.map((token, index) => (
                            <TokenCommandWrapper
                                key={`${route.name}-${token.symbol}`}
                                token={token}
                                route={route}
                                direction={direction}
                                onSelect={onSelect}
                                selectedRoute={selectedRoute}
                                selectedToken={selectedToken}
                            />
                        ))}
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    </div>)
}


type TokenCommandWrapperProps = {
    token: RouteToken;
    route: Route;
    direction: SwapDirection;
    onSelect: (route: Route, token: RouteToken) => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
}

const TokenCommandWrapper = ({
    token,
    route,
    direction,
    onSelect,
    selectedRoute,
    selectedToken
}: TokenCommandWrapperProps) => {
    const tokenItemRef = useRef<HTMLDivElement>(null)
    const isSelected = selectedRoute === route.name && selectedToken === token.symbol

    // useEffect(() => {
    //     if (isSelected && tokenItemRef.current) {
    //         tokenItemRef.current.scrollIntoView({ behavior: "instant", block: "center" });
    //     }
    // }, [isSelected])

    return (
        <div
            ref={tokenItemRef}
            className={`pl-5 cursor-pointer hover:bg-secondary-300 ${isSelected ? "bg-secondary-300" : ""} outline-none disabled:cursor-not-allowed`}
            onClick={() => onSelect(route, token)}
        >
            <CurrencySelectItemDisplay
                item={token}
                selected={isSelected}
                route={route}
                direction={direction}
            />
        </div>
    )
}
