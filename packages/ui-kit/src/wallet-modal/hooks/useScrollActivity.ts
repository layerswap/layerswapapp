import { useCallback, useEffect, useRef, useState } from "react";
import type { UIEventHandler } from "react";

const SCROLL_IDLE_DELAY_MS = 1000

export function useScrollActivity() {
    const [isScrolling, setIsScrolling] = useState(false)
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    const handleScroll = useCallback<UIEventHandler<HTMLDivElement>>(() => {
        setIsScrolling(true)

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
        }

        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false)
        }, SCROLL_IDLE_DELAY_MS)
    }, [])

    useEffect(() => () => {
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current)
        }
    }, [])

    return { isScrolling, handleScroll }
}
