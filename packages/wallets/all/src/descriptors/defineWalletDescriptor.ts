import type { WalletProvider, WalletProviderDescriptor, WalletWrapper } from "@layerswap/widget/types"
import type { WalletProviderId } from "@layerswap/widget-types"

/**
 * Identity helper that pins a default descriptor's `id` at the type level:
 *
 * 1. The id must be a member of the public `WalletProviderId` union in
 *    `@layerswap/widget-types` — the contract `walletProvidersConfig`'s
 *    `include`/`exclude` filters are typed against.
 * 2. The provider returned by `loadProvider()` must declare the same literal
 *    id (chain packages type their factories as
 *    `WalletProvider & { id: typeof id }`), so the registry key cannot flip
 *    when a descriptor hydrates into its real provider.
 *
 * Either kind of drift is a compile error instead of a silently broken
 * id-keyed lookup.
 */
export function defineWalletDescriptor<Id extends WalletProviderId>(
    descriptor: Omit<WalletProviderDescriptor, 'id' | 'loadProvider'> & {
        id: Id
        // NoInfer keeps `id` the sole inference site — otherwise a mismatched
        // provider id would silently widen `Id` to a union instead of erroring.
        loadProvider: () => Promise<(WalletProvider | WalletWrapper) & { id: NoInfer<Id> }>
    }
): WalletProviderDescriptor {
    return descriptor
}
