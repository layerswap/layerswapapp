import useWindowDimensions from "@/hooks/useWindowDimensions";
import { DetailedHTMLProps, InputHTMLAttributes, useEffect, useRef, useState } from "react";
import FilledX from "@/components/icons/FilledX";
import SearchIcon from "@/components/icons/SearchIcon";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

type SearchComponentProps = DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isOpen?: boolean
    containerClassName?: string;
    hideSearchIcon?: boolean;
    animatedPlaceholders?: string[];
    animatedPlaceholderInterval?: number;
}

export const SearchComponent = ({ searchQuery, setSearchQuery, isOpen, containerClassName, hideSearchIcon, animatedPlaceholders, animatedPlaceholderInterval = 3000, ...props }: SearchComponentProps) => {
    const { isDesktop } = useWindowDimensions();
    const inputRef = useRef<HTMLInputElement>(null);
    const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);

    useEffect(() => {
        if (isOpen && isDesktop && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isDesktop]);

    useEffect(() => {
        if (!animatedPlaceholders?.length || searchQuery) return;

        const interval = setInterval(() => {
            setCurrentPlaceholderIndex((prev) => (prev + 1) % animatedPlaceholders.length);
        }, animatedPlaceholderInterval);

        return () => clearInterval(interval);
    }, [animatedPlaceholders, animatedPlaceholderInterval, searchQuery]);

    const showAnimatedPlaceholder = animatedPlaceholders?.length && !searchQuery;
    const currentPlaceholder = animatedPlaceholders?.[currentPlaceholderIndex] ?? "";

    return <div className={`relative flex items-center bg-secondary-500 focus-within:bg-secondary-300 rounded-lg px-2 mb-2 h-10 ${containerClassName}`}>
        {
            !hideSearchIcon &&
            <div className="w-6 h-6 flex items-center justify-center mr-2">
                <SearchIcon className="text-primary-text-tertiary" />
            </div>
        }
        <div className="relative w-full">
            <input
                {...props}
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus={isDesktop}
                placeholder={showAnimatedPlaceholder ? "" : (props.placeholder ?? "Search")}
                autoComplete="off"
                className={clsx("placeholder:text-primary-text-tertiary border-0 border-b-0 border-primary-text bg-secondary-500 focus:bg-secondary-300 focus:border-primary-text appearance-none block py-2 px-0 w-full text-base outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
                    props.className
                )}
            />
            {showAnimatedPlaceholder && (
                <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={currentPlaceholder}
                            initial={currentPlaceholderIndex === 0 ? false : { y: "100%", opacity: 0, filter: "blur(4px)" }}
                            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                            exit={{ y: "-80%", opacity: 0, filter: "blur(4px)" }}
                            transition={{
                                duration: 0.4,
                                ease: "easeInOut",
                                filter: { duration: 0.5 },
                            }}
                            style={{ willChange: "transform, opacity, filter" }}
                            className="text-primary-text-tertiary text-base whitespace-nowrap"
                        >
                            {currentPlaceholder}
                        </motion.span>
                    </AnimatePresence>
                </div>
            )}
        </div>
        {searchQuery && (
            <button
                type="button"
                className="w-4 h-4 text-primary-text-tertiary cursor-pointer ml-2 flex items-center justify-center"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchQuery('');
                }}
                aria-label="Clear search"
            >
                <FilledX className="w-4 h-4" />
            </button>
        )}
    </div>
}