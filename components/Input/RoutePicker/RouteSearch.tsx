import { FC, useEffect, useMemo, useState } from "react";
import { SearchComponent } from "../Search";
import { motion } from "framer-motion";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import clsx from "clsx";
import { NetworkElement, RowElement } from "@/Models/Route";
import { useSelectorState } from "@/components/Select/Selector/Index";
import { TypingEffect } from "./Rows/SuggestionsHeader";

type RouteSearchProps = {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    rowElements: RowElement[];
    isItemsScrolling: boolean;
}

const RouteSearch: FC<RouteSearchProps> = ({ searchQuery, setSearchQuery, rowElements, isItemsScrolling }) => {
    const { shouldFocus } = useSelectorState();

    const [isFocused, setIsFocused] = useState(false);
    const [showExpanded, setShowExpanded] = useState(false);
    const [randomRoute, setRandomRoute] = useState<NetworkElement | null>(null);
    const { windowSize } = useWindowDimensions()

    const isDesktop = windowSize?.width && windowSize.width >= 640;

    const width = showExpanded ? 500 : (isDesktop ? 438 : (windowSize?.width ? windowSize.width - 36 : 438));
    const aspectRatio = showExpanded ? (isDesktop ? 3.5 : 3.3) : (width / 40);

    useEffect(() => {
        if (isItemsScrolling && showExpanded) {
            setShowExpanded(false);
        }
    }, [isItemsScrolling]);

    useEffect(() => {
        if (isFocused && !showExpanded) {
            setShowExpanded(true);
        } else if(!isFocused && showExpanded) {
            setShowExpanded(false);
        }
    }, [isFocused])

    useEffect(() => {
        if (!showExpanded || searchQuery) return;

        const pickRandomRoute = () => {
            if (rowElements && rowElements.length > 0) {
                const networkElements = rowElements.filter((element) => element.type === 'network');

                if (networkElements.length > 0) {
                    const random = networkElements[Math.floor(Math.random() * networkElements.length)];
                    setRandomRoute(random as NetworkElement);
                }
            }
        };

        pickRandomRoute();

        const interval = setInterval(pickRandomRoute, 3000);

        return () => clearInterval(interval);
    }, [rowElements, showExpanded]);

    const randomRouteName = useMemo(() => randomRoute?.route.tokens[Math.floor(Math.random() * randomRoute?.route.tokens?.length)].symbol + " " + (randomRoute?.route?.display_name || randomRoute?.route?.name || ""), [randomRoute?.route.name]);

    return <div>
        <motion.div
            className="absolute z-0 bg-linear-180 from-secondary-500 from-70% to-secondary-500/0 backdrop-blur-sm -translate-x-1/2 -translate-y-1/2 left-1/2 top-19 sm:top-18 rounded-lg! shadow-lg!"
            animate={{
                width: width,
                height: width / aspectRatio,
            }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
            }}
        />

        <motion.div
            className="relative"
            animate={showExpanded ? "open" : "closed"}
            variants={sidebarVariants}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
            }}
        >
            <SearchComponent
                hideSearchIcon={showExpanded}
                containerClassName={clsx("relative z-10", {
                    "bg-transparent! focus-within:bg-secondary-transparent!": showExpanded,
                    "focus-within:bg-secondary-500!": !showExpanded
                })}
                className={clsx("z-20", {
                    "text-2xl! bg-transparent! focus:bg-secondary-transparent!": showExpanded,
                    "focus:bg-secondary-500! focus:caret-transparent ": !showExpanded
                })}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onClick={() => setShowExpanded(true)}
                isOpen={shouldFocus}
                placeholder={showExpanded ? "" : "Search Tokens, Networks or both"}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
            {showExpanded && !searchQuery && (
                <div className="absolute top-3 left-3">
                    <TypingEffect
                        key={randomRouteName}
                        text={randomRouteName}
                        withShine={false}
                        className="text-2xl leading-4 text-secondary-text"
                    />
                </div>
            )}
        </motion.div>
    </div>
}

const sidebarVariants = {
    open: {
        marginBottom: 60,
    },
    closed: {
        marginBottom: 0,
    }
}

export default RouteSearch