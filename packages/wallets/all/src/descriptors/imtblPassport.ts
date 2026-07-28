import type { WalletProviderDescriptor } from "@layerswap/widget/types"
import type { ImtblPassportConfig } from "@layerswap/wallet-imtbl-passport"
import { defineWalletDescriptor } from "./defineWalletDescriptor"

/**
 * Tree-shake-safe stand-in for `createImmutablePassportProvider`. The factory
 * is small, but running it imports `ImtblPassportService`, whose `@imtbl/sdk`
 * chunks (~993 KB) then load eagerly on `/` — so defer the factory call
 * itself. `/imtblRedirect` is unaffected (it imports the real factory
 * directly). Empty network arrays are intentional: Passport authenticates and
 * delegates to the EVM provider, so it's a connector, never a route source.
 */
export function createImmutablePassportDescriptor(imtblPassportConfig: ImtblPassportConfig): WalletProviderDescriptor {
    return defineWalletDescriptor({
        id: 'imtblPassport',
        name: 'Immutable Passport',
        autofillSupportedNetworks: [],
        withdrawalSupportedNetworks: [],
        asSourceSupportedNetworks: [],
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-imtbl-passport')
            return mod.createImmutablePassportProvider({ imtblPassportConfig })
        },
    })
}
