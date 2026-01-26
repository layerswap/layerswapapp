import useWindowDimensions from "@/hooks/useWindowDimensions";
import { DetailedHTMLProps, InputHTMLAttributes, useEffect, useRef } from "react";
import FilledX from "@/components/icons/FilledX";
import SearchIcon from "@/components/icons/SearchIcon";
import clsx from "clsx";

type SearchComponentProps = DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isOpen?: boolean
    containerClassName?: string;
    hideSearchIcon?: boolean;
}

export const SearchComponent = ({ searchQuery, setSearchQuery, isOpen, containerClassName, hideSearchIcon, ...props }: SearchComponentProps) => {
    const { isDesktop } = useWindowDimensions();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return <div className={`flex items-center bg-secondary-500 focus-within:bg-secondary-300 rounded-lg px-2 mb-2 h-10 ${containerClassName}`}>
        {
            !hideSearchIcon &&
            <div className="w-6 h-6 flex items-center justify-center mr-1">
                <SearchIcon className="text-primary-text-tertiary" />
            </div>
        }
        <input
            {...props}
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={isDesktop}
            placeholder={props.placeholder ?? "Search"}
            autoComplete="off"
            className={clsx("placeholder:text-primary-text-tertiary border-0 border-b-0 border-primary-text bg-secondary-500 focus:bg-secondary-300 focus:border-primary-text appearance-none block py-2 px-0 w-full text-base outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
                props.className
            )}
        />
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