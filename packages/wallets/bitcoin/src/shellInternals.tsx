'use client'
// Shared between ./index.tsx (slim shell surface) and ./legacy.tsx
// (deprecated singleton + factory).
//
// We render the React.lazy reference directly — see commit comment in
// any other chain's shellInternals.tsx for the rationale.
import { lazy } from "react"

// BitcoinProvider is a named export — adapt to React.lazy's default-export
// contract by re-exposing it as `default`.
export const BitcoinProviderWrapper = /*#__PURE__*/ lazy(async () => {
    const m = await import("./BitcoinProvider")
    return { default: m.BitcoinProvider }
})

export const preloadBitcoinProvider = (): Promise<unknown> => import("./BitcoinProvider")
