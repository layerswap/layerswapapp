import useWindowDimensions from "@/hooks/useWindowDimensions";
import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import FilledX from "../Icons/FilledX";

export const SearchComponent = ({ searchQuery, setSearchQuery, isOpen }: { searchQuery: string, setSearchQuery: (query: string) => void, isOpen?: boolean }) => {
    const { isDesktop } = useWindowDimensions();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return <div className="flex items-center bg-secondary-500 rounded-lg px-2 mb-2">
        <Search className="w-6 h-6 mr-2 text-primary-text-tertiary" />
        <input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={isDesktop}
            placeholder="Search"
            autoComplete="off"
            className="placeholder:text-primary-text-tertiary border-0 border-b-0 border-primary-text bg-secondary-500 focus:border-primary-text appearance-none block py-2.5 px-0 w-full h-11 text-base outline-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
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