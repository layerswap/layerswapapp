import { InternalConnector } from "@/types"

/**
 * Resolve a wallet connector's icon to a string URL / data URI for use as
 * `Wallet.icon` (the contract). Returns `undefined` when no icon is
 * available — the widget's `WalletIconView` falls back to an AddressIcon
 * in that case.
 *
 * Historically this returned a React component. After the icon-string
 * migration, it's a thin passthrough.
 */
export const resolveWalletConnectorIcon = (
    { connector, iconUrl }: { connector?: InternalConnector, address?: string, iconUrl?: string },
): string | undefined => connector?.icon || iconUrl || undefined

export const walletIconResolver = (
    _address: string | undefined,
    iconUrl: string | undefined,
): string | undefined => iconUrl || undefined
