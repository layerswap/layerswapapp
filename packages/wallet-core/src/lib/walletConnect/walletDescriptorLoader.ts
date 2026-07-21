"use client";
import { createContext, useContext } from "react"

/**
 * Triggers the lazy import of a wallet provider descriptor by id. No-op if
 * the descriptor has already been loaded (or if id refers to an eager
 * provider). Exposed by `LayerswapProvider`; consumed by the connect modal
 * to hydrate descriptors on demand.
 */
export type WalletDescriptorLoader = (id: string) => Promise<void>

const noop: WalletDescriptorLoader = async () => { }

export const WalletDescriptorLoaderContext = createContext<{
    loadById: WalletDescriptorLoader
    loadAll: () => Promise<void>
}>({ loadById: noop, loadAll: async () => { } })

export const useWalletDescriptorLoader = () => useContext(WalletDescriptorLoaderContext)
