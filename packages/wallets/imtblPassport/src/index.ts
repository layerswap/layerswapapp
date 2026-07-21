import type { WalletInitContext, WalletWrapper } from "@layerswap/wallet-core/types"
import { imtblPassportService } from "./service/ImtblPassportService"

export type ImtblPassportConfig = {
    publishableKey: string
    clientId: string
    redirectUri: string
    logoutRedirectUri: string
}

export type ImmutablePassportProviderConfig = {
    imtblPassportConfig?: ImtblPassportConfig
}

export function createImmutablePassportProvider(config: ImmutablePassportProviderConfig = {}): WalletWrapper {
    const { imtblPassportConfig } = config

    const init = (_ctx: WalletInitContext) => {
        imtblPassportService.setConfig(imtblPassportConfig)
        imtblPassportService.ensureEvmConnected().catch(() => { /* swallow */ })
        // No-op disposer; init is idempotent across remounts.
    }

    return {
        id: "imtblPassport",
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
