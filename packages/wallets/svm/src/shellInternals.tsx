'use client'
// Shared between ./index.tsx (slim shell surface) and ./legacy.tsx
// (deprecated singleton + factory). Holds the lazy SVMProvider wrapper +
// the WalletConnect config context.
//
// We render the React.lazy reference directly — see commit comment in
// any other chain's shellInternals.tsx for the rationale (sync-when-
// cached caused wrapper-subtree remounts on chunk land).
import React, { createContext, lazy, useContext } from "react"

export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

export const WalletConnectConfigContext: React.Context<WalletConnectConfig | null> =
    createContext<WalletConnectConfig | null>(null)

export const useWalletConnectConfig: () => WalletConnectConfig | null = () =>
    useContext(WalletConnectConfigContext)

export const SVMProviderWrapper = /*#__PURE__*/ lazy(() => import("./SVMProvider"))

export const preloadSVMProvider = (): Promise<unknown> => import("./SVMProvider")
