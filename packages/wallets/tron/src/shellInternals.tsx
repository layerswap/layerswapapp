'use client'
// Shared between ./index.tsx (slim shell surface) and ./legacy.tsx
// (deprecated singleton + factory).
//
// We render the React.lazy reference directly — see commit comment in
// any other chain's shellInternals.tsx for the rationale.
import { lazy } from "react"

export const TronProviderWrapper = /*#__PURE__*/ lazy(() => import("./TronProvider"))

export const preloadTronProvider = (): Promise<unknown> => import("./TronProvider")
