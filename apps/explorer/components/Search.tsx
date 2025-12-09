"use client"

import { SearchIcon, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const Search = () => {
    const params = useParams()

    // Normalize params to always be a string
    const normalizeParam = (param: string | string[] | undefined): string => {
        if (!param) return '';
        return Array.isArray(param) ? param[0] : param;
    };

    const [searchParam, setSearchParam] = useState(normalizeParam(params.searchParam));
    const router = useRouter();

    useEffect(() => {
        setSearchParam(normalizeParam(params.searchParam));
    }, [params.searchParam]);

    const handleKeyDown = (event: any) => {
        if (event.key === 'Enter') {
            handleSearch()
        }
    }

    function getLastPart(url: string) {
        const parts = url.split('/');
        return parts.at(-1);
    }

    const handleSearch = () => {
        const url = getLastPart(searchParam)
        router.push(`/${url}`)
    }

    const clearSearch = () => {
        setSearchParam('')
    }

    return (
        <div className="w-full mt-5 flex items-center ">
            <div className="relative w-full pl-2 bg-secondary-600 p-1.5 rounded-md">
                <input
                    type="text"
                    name="searchParam"
                    id="searchParam"
                    value={searchParam}
                    onChange={(v) => setSearchParam(v.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search by Address / Source Tx / Destination Tx"
                    className="block w-full rounded-md pl-3 pr-4 border-2 border-transparent placeholder:text-xs md:placeholder:text-base placeholder:leading-3 focus:border-secondary-500 duration-200 transition-all outline-none text-white bg-secondary-600 shadow-sm placeholder:text-primary-text "
                />
                {searchParam &&
                    <XCircle onClick={clearSearch} className="h-5 w-5 absolute z-20 right-2 top-2.5 cursor-pointer" stroke="#20283D" fill="#adb5d0" />
                }
            </div>
            <div className="p-2">
                <button
                    disabled={!searchParam}
                    onClick={handleSearch}
                    className="disabled:bg-primary-text-tertiary disabled:hover:text-white rounded-lg bg-primary-500 shadow-lg p-2 hover:bg-primary-700 hover:text-primary-text active:scale-90 duration-200 transition-all font-sans text-xs text-white"
                >
                    <SearchIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}

export default Search;