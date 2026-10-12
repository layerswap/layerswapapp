import { isWalletInfoCurrentlyInjected, type DeviceInfo, type WalletInfo, type WalletInfoCurrentlyInjected } from '@tonconnect/sdk'

type InjectedTonProvider = {
    tonconnect?: { deviceInfo?: DeviceInfo }
}

export function isTonWalletInstalled(info: WalletInfo, wallets: readonly WalletInfo[]): info is WalletInfoCurrentlyInjected {
    if (!isWalletInfoCurrentlyInjected(info) || typeof window === 'undefined') return false

    const provider = Reflect.get(window, info.jsBridgeKey) as InjectedTonProvider | undefined
    const tonconnect = provider?.tonconnect
    if (!tonconnect) return false

    const appName = tonconnect.deviceInfo?.appName
    if (typeof appName !== 'string') return true

    const identity = appName.toLowerCase()
    // Like Tron's ownership check, reject an alias that exposes another wallet's API.
    return !wallets.some(candidate => {
        if (!isWalletInfoCurrentlyInjected(candidate) || candidate.jsBridgeKey === info.jsBridgeKey) return false

        const otherProvider = Reflect.get(window, candidate.jsBridgeKey) as InjectedTonProvider | undefined
        return otherProvider?.tonconnect === tonconnect
            && (candidate.appName.toLowerCase() === identity || candidate.name.toLowerCase() === identity)
    })
}
