"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Search } from "lucide-react";
import { AnalyticsNetwork } from "@/models/Analytics";

function NetworkBadge({ network, size = 26 }: { network: AnalyticsNetwork; size?: number }) {
    return network.logo ? (
        <Image
            src={network.logo}
            alt={network.display_name}
            width={size}
            height={size}
            decoding="async"
            className="rounded-full shrink-0"
        />
    ) : (
        <span
            className="rounded-full bg-[#283247] shrink-0"
            style={{ width: size, height: size }}
        />
    );
}

export default function ChainSelector({
    networks,
    selected,
    onSelect,
}: {
    networks: AnalyticsNetwork[];
    selected: AnalyticsNetwork | null;
    onSelect: (n: AnalyticsNetwork) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return networks;
        return networks.filter(
            (n) =>
                n.display_name.toLowerCase().includes(q) ||
                n.name.toLowerCase().includes(q)
        );
    }, [networks, query]);

    const close = () => {
        setOpen(false);
        setQuery("");
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    setOpen((o) => !o);
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex items-center gap-[11px] bg-[#171f31] border border-[#283247] hover:border-[#3c4861] rounded-[13px] pl-[10px] pr-3 py-2 min-w-[236px] transition-colors"
            >
                {selected ? (
                    <NetworkBadge network={selected} />
                ) : (
                    <span className="w-[26px] h-[26px] rounded-full bg-[#283247] shrink-0" />
                )}
                <span className="flex flex-col items-start leading-[1.15] flex-1 min-w-0">
                    <span className="text-[11px] text-[#768093] tracking-[0.02em]">Network</span>
                    <span className="text-[15.5px] text-[#e1e3e6] font-semibold truncate max-w-full">
                        {selected?.display_name ?? "Select network"}
                    </span>
                </span>
                <ChevronDown className="w-[17px] h-[17px] text-[#a3adc2] shrink-0" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={close} />
                    <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[352px] bg-[#171f31] border border-[#283247] rounded-2xl shadow-[0_20px_48px_rgba(0,0,0,.55),0_4px_16px_rgba(0,0,0,.4)] p-[10px]">
                        <div className="flex items-center gap-2 bg-[#0e1524] border border-[#283247] rounded-[10px] px-[10px] h-[38px] mb-2">
                            <Search className="w-4 h-4 text-[#768093] shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search network"
                                className="flex-1 bg-transparent border-0 outline-none text-[#e1e3e6] text-sm h-full placeholder:text-[#768093]"
                            />
                        </div>
                        <div
                            className="max-h-[328px] overflow-y-auto flex flex-col gap-0.5"
                            role="listbox"
                        >
                            {filtered.map((n) => {
                                const active = selected?.name === n.name;
                                return (
                                    <button
                                        key={n.name}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        onClick={() => {
                                            onSelect(n);
                                            close();
                                        }}
                                        className={`flex items-center justify-between gap-2 rounded-[10px] px-[10px] py-2 text-left transition-colors ${active ? "bg-[#0f1c3a]" : "hover:bg-[#0f1c3a]"
                                            }`}
                                    >
                                        <span className="flex items-center gap-[11px] min-w-0">
                                            <NetworkBadge network={n} size={24} />
                                            <span className="text-[14.5px] text-[#e1e3e6] truncate">
                                                {n.display_name}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                            {filtered.length === 0 && (
                                <div className="px-[10px] py-4 text-[13px] text-[#768093] text-center">
                                    No networks match “{query}”.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export { NetworkBadge };
