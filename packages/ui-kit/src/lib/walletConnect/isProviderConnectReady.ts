import type { WalletConnectionProvider } from "@/types/wallet"

export function isProviderConnectReady(provider: WalletConnectionProvider | undefined): boolean {
    if (!provider) return true
    return provider.isStub === true || (typeof provider.ready === "boolean" ? provider.ready : true)
}
