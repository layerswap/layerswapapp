"use client";
import { createContext, useContext } from "react"

/**
 * Triggers the lazy import of a wallet provider descriptor by id. No-op if
 * the descriptor has already been loaded (or if id refers to an eager
 * provider). Exposed by `LayerswapProvider`; consumed by the connect modal
 * to hydrate descriptors on demand.
 *
 * Never rejects: load failures are logged and absorbed (the descriptor stays
 * pending and a later call retries), so callers that need the live provider
 * must re-check its state in the registry after awaiting.
 */
export type WalletDescriptorLoader = (id: string) => Promise<void>

const noop: WalletDescriptorLoader = async () => { }

export const WalletDescriptorLoaderContext = createContext<{
    loadById: WalletDescriptorLoader
    loadAll: () => Promise<void>
}>({ loadById: noop, loadAll: async () => { } })

export const useWalletDescriptorLoader = () => useContext(WalletDescriptorLoaderContext)
