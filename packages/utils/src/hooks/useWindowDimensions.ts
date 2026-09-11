"use client";
import { useEffect, useState } from "react"

export default function useWindowDimensions() {
    const [windowSize, setWindowSize] = useState<{
        width: number | undefined
        height: number | undefined
    }>({
        width: undefined,
        height: undefined,
    })

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }

        window.addEventListener("resize", handleResize)
        handleResize()
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const isMobile = typeof windowSize.width === "number" && windowSize.width < 768
    const isDesktop = typeof windowSize.width === "number" && windowSize.width >= 768

    return { windowSize, isMobile, isDesktop }
}