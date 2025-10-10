import useWindowDimensions from "@/hooks/useWindowDimensions";
import { useEffect, useRef } from "react";
import FilledX from "@/components/icons/FilledX";
import SearchIcon from "@/components/icons/SearchIcon";

type SearchComponentProps = {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isOpen?: boolean
    className?: string;
    placeholder?: string;
}

export const SearchComponent = ({ searchQuery, setSearchQuery, isOpen, className, placeholder }: SearchComponentProps) => {
    const { isDesktop } = useWindowDimensions();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return <div className={`flex items-center bg-secondary-500 focus-within:bg-secondary-300 rounded-lg px-2 mb-2 h-10 ${className}`}>
        <div className="w-6 h-6 flex items-center justify-center mr-1">
            <SearchIcon className="text-primary-text-tertiary" />
        </div>
        <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={isDesktop}
            placeholder={placeholder ?? "Search"}
            autoComplete="off"
            className="placeholder:text-primary-text-tertiary border-0 border-b-0 border-primary-text bg-secondary-500 focus:bg-secondary-300 focus:border-primary-text appearance-none block py-2 px-0 w-full  text-base outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {searchQuery && (
            <FilledX
                className="w-4 h-4 text-primary-text-tertiary cursor-pointer ml-2"
                onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchQuery('');
                }}
            />
        )}
    </div>
}