import type { WalletInitContext, WalletWrapper } from "@layerswap/wallet-core/types"
import { imtblPassportService } from "./service/ImtblPassportService"
import { id } from "./constants"

export type ImtblPassportConfig = {
    publishableKey: string
    clientId: string
    redirectUri: string
    logoutRedirectUri: string
}

export type ImmutablePassportProviderConfig = {
    imtblPassportConfig?: ImtblPassportConfig
}

// The literal id in the return type lets `defineWalletDescriptor` in
// `@layerswap/wallets` verify it matches the descriptor id at compile time.
export function createImmutablePassportProvider(config: ImmutablePassportProviderConfig = {}): WalletWrapper & { id: typeof id } {
    const { imtblPassportConfig } = config

    const init = (_ctx: WalletInitContext) => {
        imtblPassportService.setConfig(imtblPassportConfig)
        imtblPassportService.ensureEvmConnected().catch(() => { /* swallow */ })
        // No-op disposer; init is idempotent across remounts.
    }

    return {
        id,
        init,
    }
}

/**
 * Run the Passport OAuth redirect handler. Call this from your redirect page
 * once the route has loaded (e.g. inside a `useEffect`). Replaces the old
 * `<ImtblRedirect />` React component.
 */
export async function imtblPassportLoginCallback(config?: ImtblPassportConfig): Promise<void> {
    if (config) imtblPassportService.setConfig(config)
    await imtblPassportService.loginCallback()
}

export { imtblPassportService } from "./service/ImtblPassportService"
export { useImtblPassportStore } from "./service/imtblPassportStore"
