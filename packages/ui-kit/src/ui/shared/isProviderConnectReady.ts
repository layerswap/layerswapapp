import type { WalletConnectionProvider } from "@/types"

export function isProviderConnectReady(provider: WalletConnectionProvider | undefined): boolean {
    if (!provider) return true
    return provider.isStub === true || (typeof provider.ready === "boolean" ? provider.ready : true)
}
