'use client'
// Shared between ./index.tsx (slim shell surface) and ./legacy.tsx
// (deprecated singleton + factory). Keeping the lazy wrapper here means
// neither file pulls @starknet-react/core at module-load time.
//
// We render the React.lazy reference directly — React.lazy caches its
// resolved module internally, so subsequent renders do not re-suspend.
// A previous "sync-when-cached" wrapper (return <Impl> after load,
// else return <Lazy>) caused the wrapper subtree to remount when the
// chunk landed: React reconciles by component type, and the type would
// swap from <Lazy> to <Impl> on re-render — visible as disappear/
// reappear cycles when chunks landed at different times across chains.
import { lazy } from "react"

export const StarknetProviderWrapper = /*#__PURE__*/ lazy(() => import("./StarknetProvider"))

export const preloadStarknetProvider = (): Promise<unknown> => import("./StarknetProvider")
