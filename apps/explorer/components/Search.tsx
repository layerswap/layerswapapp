"use client"

import { SearchIcon, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

function normalizeParam(param: string | string[] | undefined): string {
    if (!param) return "";
    return Array.isArray(param) ? param[0] : param;
}

const Search = () => {
    const params = useParams()
    const [searchParam, setSearchParam] = useState(normalizeParam(params.searchParam));
    const router = useRouter();

    useEffect(() => {
        setSearchParam(normalizeParam(params.searchParam));
    }, [params.searchParam]);

    function getLastPart(url: string) {
        const parts = url.split('/');
        return parts.at(-1);
    }

    const handleSearch = (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        const url = getLastPart(searchParam.trim())
        if (!url) return;
        router.push(`/${url}`)
    }

    const clearSearch = () => {
        setSearchParam('')
    }

    return (
        <form className="mt-5 flex w-full items-center gap-2" onSubmit={handleSearch}>
            <div className="relative flex min-h-14 w-full items-center rounded-2xl bg-secondary-500 px-4 transition-colors focus-within:bg-secondary-400">
                <input
                    type="text"
                    name="searchParam"
                    id="searchParam"
                    value={searchParam}
                    onChange={(v) => setSearchParam(v.target.value)}
                    placeholder="Search by Address / Source Tx / Destination Tx"
                    className="block w-full border-0 bg-transparent pr-10 text-sm text-primary-text outline-none placeholder:text-primary-text-tertiary md:text-base"
                />
                {searchParam ? (
                    <button
                        type="button"
                        onClick={clearSearch}
                        aria-label="Clear search"
                        className="absolute right-2 rounded-lg p-2 text-secondary-text transition-colors hover:bg-secondary-300 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                ) : null}
            </div>
            <button
                type="submit"
                disabled={!searchParam.trim()}
                aria-label="Search"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-primary-buttonTextColor transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:animate-press-down disabled:cursor-not-allowed disabled:bg-secondary-300 disabled:text-secondary-text/50"
            >
                <SearchIcon className="h-5 w-5" />
            </button>
        </form>
    )
}

export default Search;
