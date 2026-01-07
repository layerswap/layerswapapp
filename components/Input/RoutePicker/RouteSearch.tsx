import { FC, useState } from "react";
import { SearchComponent } from "../Search";
import clsx from "clsx";

const RouteSearch: FC<{ searchQuery: string, setSearchQuery: (query: string) => void, shouldFocus: boolean }> = ({ searchQuery, setSearchQuery, shouldFocus }) => {
    const [isFocused, setIsFocused] = useState(false);

    return <div>
        <SearchComponent
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isOpen={shouldFocus}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
        />
    </div>
}

export default RouteSearch