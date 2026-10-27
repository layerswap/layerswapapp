import { useEffect } from "react";
import type { RefObject } from "react";

type UseLoadMoreObserverParams = {
    cursorKey: string;
    enabled: boolean;
    isListVisible: boolean;
    loadMore: () => Promise<void>;
    triggerRef: RefObject<HTMLDivElement | null>;
}

export function useLoadMoreObserver({
    cursorKey,
    enabled,
    isListVisible,
    loadMore,
    triggerRef,
}: UseLoadMoreObserverParams) {
    // Re-observe when the cursor advances even if a cached page resolves so
    // quickly that React batches loading=true and loading=false. A newly
    // attached observer reports the sentinel's current intersection and
    // continues through cached pages until it reaches an uncached page.
    useEffect(() => {
        if (!isListVisible || !triggerRef.current) return

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && enabled) {
                void loadMore()
            }
        }, { threshold: 0.1, rootMargin: "100px" })

        observer.observe(triggerRef.current)
        return () => observer.disconnect()
    }, [cursorKey, enabled, isListVisible, loadMore, triggerRef])
}
