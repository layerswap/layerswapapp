import { solanaWalletConnectWallets } from "../connectors/resolveConnectors"

export const isSolanaAdapterSupported = (adapterName: string): boolean => {
    const normalizedAdapterName = adapterName.toLowerCase().trim()

    return solanaWalletConnectWallets.some(wallet => {
        const matchName = wallet.shortName?.toLowerCase().trim()
        if (!matchName) return false

        if (normalizedAdapterName === matchName) return true
        if (normalizedAdapterName.includes(matchName)) return true
        if (matchName.includes(normalizedAdapterName)) return true

        return false
    })
}