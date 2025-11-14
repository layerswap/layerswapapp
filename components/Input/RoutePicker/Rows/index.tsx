import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { RowElement } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { CurrencySelectItemDisplay } from "../Routes";
import { CollapsibleRow } from "./CollapsibleRow";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import RouteTokenSwitch from "../RouteTokenSwitch";
import clsx from "clsx";
import { SelectItem } from "@/components/Select/Selector/SelectItem";
import { useBalanceStore } from "@/stores/balanceStore";
import { AnimatePresence, motion, useInView } from "framer-motion";
import React from "react";

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
}: Props) {

    switch (item.type) {
        case "network":
        case "grouped_token":
            return (
                <CollapsibleRow
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
                />
            );
        case "network_token":
        case "suggested_token": {
            const token = item.route.token;
            const route = item.route.route;
            const isSelected = selectedRoute === route.name && selectedToken === token.symbol;

            return (
                <div className={clsx("cursor-pointer hover:bg-secondary-500 outline-none disabled:cursor-not-allowed rounded-xl")} onClick={() => onSelect(route, token)} >
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
            if (item.text.toLowerCase().includes("suggestions")) {
                return <SuggestionsTitle />
            }
            return (
                <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline" >
                    <p>
                        {item.text}
                    </p>
                    {
                        item.text.toLowerCase().includes("all") &&
                        <div className="relative ml-auto">
                            <RouteTokenSwitch />
                        </div>
                    }
                </div>
            );
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
                                <div className="w-2 h-2 my-1 bg-secondary-500 rounded-[4px]" />
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

const randomWords = [
    'Marinading',
    "Fermenting",
    "Steeping",
    "Infusing",
    "Polishing",
    "Spicing",
    "Compiling",
    "Brewing",
    "Spinning",
    "Booting",
    "Rendering",
    "Synthesizing",
    "Inferring",
    "Neuralizing",
    "Augmenting",
    "Finalizing",
    "Cooking"
]

const SuggestionsTitle = () => {
    const isLoading = useBalanceStore(s => s.sortingDataIsLoading)
    const partialPublished = useBalanceStore(s => s.partialPublished)

    const suggestionsTitle = useMemo(() => isLoading ? `${randomWords[Math.floor(Math.random() * randomWords.length)]}` : '', [isLoading, partialPublished])
    const [typingComplete, setTypingComplete] = useState(!isLoading)
    const [textToType, setTextToType] = useState(suggestionsTitle)

    useEffect(() => {
        if (isLoading) {
            setTypingComplete(false)
            setTextToType(suggestionsTitle)
        }
    }, [isLoading, suggestionsTitle])


    if (!isLoading && typingComplete) {
        return <div className="text-primary-text-tertiary text-base font-normal leading-5 pl-1 sticky top-0 z-50 flex items-baseline">Suggestions</div>
    }

    return <TypingEffect text={`${textToType} Suggestions`} onComplete={() => setTypingComplete(true)} />
}

export function TypingEffect({ text = 'Typing Effect', onComplete }: { text: string; onComplete?: () => void }) {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true });

    useEffect(() => {
        if (isInView && onComplete) {
            // Calculate total animation duration: (text.length - 1) * 0.1 (delay) + 0.2 (duration)
            const totalDuration = (text.length - 1) * 0.1 + 0.05;
            const timeout = setTimeout(() => {
                onComplete();
            }, totalDuration * 1000); // Convert to milliseconds

            return () => clearTimeout(timeout);
        }
    }, [isInView, text.length, onComplete]);

    return (
        <div ref={ref} className="text-transparent text-base font-normal leading-5 pl-1  top-0 z-50  items-baseline bg-[linear-gradient(120deg,var(--color-primary-text-tertiary)_40%,var(--color-primary-text),var(--color-primary-text-tertiary)_60%)]
         bg-[length:200%_100%]
         bg-clip-text
         animate-shine"
            key={text}
        >
            {text.split('').map((letter, index) => (
                <motion.span
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.01, delay: index * 0.08 }}
                >
                    {letter}
                </motion.span>
            ))}
        </div >
    );
}