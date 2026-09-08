"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Search } from "lucide-react";
import { AnalyticsNetwork } from "@/models/Analytics";

function NetworkBadge({ network, size = 26 }: { network: AnalyticsNetwork; size?: number }) {
    return network.logo ? (
        <Image
            src={network.logo}
            alt=""
            width={size}
            height={size}
            decoding="async"
            className="rounded-full shrink-0"
        />
    ) : (
        <span
            className="shrink-0 rounded-full bg-secondary-300"
            style={{ width: size, height: size }}
        />
    );
}

export default function ChainSelector({
    networks,
    selected,
    onSelect,
    disabled = false,
}: {
    networks: AnalyticsNetwork[];
    selected: AnalyticsNetwork | null;
    onSelect: (n: AnalyticsNetwork) => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listboxId = useId();

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return networks;
        return networks.filter(
            (n) =>
                n.display_name.toLowerCase().includes(q) ||
                n.name.toLowerCase().includes(q)
        );
    }, [networks, query]);

    const close = useCallback((restoreFocus = false) => {
        setOpen(false);
        setQuery("");
        if (restoreFocus) {
            window.requestAnimationFrame(() => triggerRef.current?.focus());
        }
    }, []);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                close(true);
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [close, open]);

    return (
        <div className="relative w-full sm:w-auto">
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (open) {
                        close();
                    } else {
                        setOpen(true);
                        window.requestAnimationFrame(() => inputRef.current?.focus());
                    }
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                aria-label="Select network"
                className="flex w-full min-w-[236px] items-center gap-[11px] rounded-[13px] border border-secondary-300 bg-secondary-500 py-2 pl-[10px] pr-3 text-left transition-colors hover:border-secondary-100 focus-visible:border-primary-400 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70 sm:w-auto"
            >
                {selected ? (
                    <NetworkBadge network={selected} />
                ) : (
                    <span className="h-[26px] w-[26px] shrink-0 rounded-full bg-secondary-300" />
                )}
                <span className="flex flex-col items-start leading-[1.15] flex-1 min-w-0">
                    <span className="text-[11px] tracking-[0.02em] text-primary-text-tertiary">Network</span>
                    <span className="max-w-full truncate text-[15.5px] font-semibold text-primary-text">
                        {selected?.display_name ?? (disabled ? "Loading networks…" : "Select network")}
                    </span>
                </span>
                <ChevronDown
                    className={`h-[17px] w-[17px] shrink-0 text-secondary-text transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onMouseDown={() => close()}
                        aria-hidden="true"
                    />
                    <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(352px,calc(100vw-2rem))] rounded-2xl border border-secondary-300 bg-secondary-500 p-[10px] shadow-accordion-open">
                        <div className="mb-2 flex h-[38px] items-center gap-2 rounded-[10px] border border-secondary-300 bg-secondary-700 px-[10px]">
                            <Search className="h-4 w-4 shrink-0 text-primary-text-tertiary" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search network"
                                aria-label="Search networks"
                                className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-primary-text outline-none placeholder:text-primary-text-tertiary"
                            />
                        </div>
                        <div
                            id={listboxId}
                            className="max-h-[328px] overflow-y-auto flex flex-col gap-0.5 styled-scroll"
                            role="listbox"
                            aria-label="Networks"
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
                                            close(true);
                                        }}
                                        className={`flex items-center justify-between gap-2 rounded-[10px] px-[10px] py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${active ? "bg-secondary" : "hover:bg-secondary"
                                            }`}
                                    >
                                        <span className="flex items-center gap-[11px] min-w-0">
                                            <NetworkBadge network={n} size={24} />
                                            <span className="truncate text-[14.5px] text-primary-text">
                                                {n.display_name}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                            {filtered.length === 0 && (
                                <div className="px-[10px] py-4 text-center text-[13px] text-primary-text-tertiary">
                                    No networks match &ldquo;{query}&rdquo;.
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
