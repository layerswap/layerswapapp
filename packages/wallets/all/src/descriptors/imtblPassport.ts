import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import type { WalletProvider, WalletWrapper } from "@layerswap/wallet-core/types"
import type { ImtblPassportConfig } from "@layerswap/wallet-imtbl-passport"

/**
 * Tree-shake-safe stand-in for `createImmutablePassportProvider`. Passport's
 * own factory is small, but the moment it runs it imports
 * `ImtblPassportService`, which in turn dynamic-imports `@imtbl/sdk` — that
 * is what the DevTools waterfall on layerswap-monorepo-bridge-layerswap
 * showed as ~993 KB of "lazy" chunks loaded eagerly on `/`.
 *
 * Deferring the factory call itself prevents `ImtblPassportService` from
 * being imported until the user actually opens the connect modal (which
 * triggers `loadAll()` in `WalletProvidersProvider`). The Passport flow on
 * `/imtblRedirect` is unaffected because that page imports
 * `createImmutablePassportProvider` and `imtblPassportLoginCallback`
 * directly from `@layerswap/wallets` — its own page chunk includes them.
 *
 * Passport has no chain-specific network names; it authenticates and then
 * delegates to the EVM provider. Empty capability arrays mean it never
 * shows up as a "source" for route filtering, which matches today's UX —
 * users select EVM and Passport is presented as one connector among several.
 */
export function createImmutablePassportDescriptor(imtblPassportConfig: ImtblPassportConfig): WalletProviderDescriptor {
    return {
        id: 'imtblPassport',
        name: 'Immutable Passport',
        autofillSupportedNetworks: [],
        withdrawalSupportedNetworks: [],
        asSourceSupportedNetworks: [],
        loadProvider: async (): Promise<WalletProvider | WalletWrapper> => {
            const mod = await import('@layerswap/wallet-imtbl-passport')
            return mod.createImmutablePassportProvider({ imtblPassportConfig })
        },
    }
}
