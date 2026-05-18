'use client'
// Shared between ./index.tsx (slim shell surface) and ./legacy.tsx
// (deprecated singleton + factory). Holds the lazy TonProvider wrapper +
// the TonConfig context.
//
// We render the React.lazy reference directly — see commit comment in
// any other chain's shellInternals.tsx for the rationale.
import React, { createContext, lazy, useContext } from "react"

export type TonClientConfig = {
    tonApiKey: string
    manifestUrl: string
}

export const TonConfigContext = createContext<TonClientConfig | null>(null)

export const useTonConfig = (): TonClientConfig | null => {
    const context = useContext(TonConfigContext)
    if (!context) return null
    return context
}

export const TonProviderWrapper = /*#__PURE__*/ lazy(() => import("./TonProvider"))

export const preloadTONProvider = (): Promise<unknown> => import("./TonProvider")
