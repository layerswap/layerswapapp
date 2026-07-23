import { InternalConnector } from "@/types"
import { normalizeIconSrc } from "./knownConnectorIcons"

/**
 * Resolve a wallet connector's icon to a string URL / data URI for use as
 * `Wallet.icon` (the contract). Returns `undefined` when no icon is
 * available — the widget's `WalletIconView` falls back to an AddressIcon
 * in that case.
 *
 * Historically this returned a React component. After the icon-string
 * migration, it's a thin passthrough that also normalizes raw inline SVG
 * markup (which some adapters expose) into a `data:` URI — see
 * `normalizeIconSrc`.
 */
export const resolveWalletConnectorIcon = (
    { connector, iconUrl }: { connector?: InternalConnector, address?: string, iconUrl?: string },
): string | undefined => normalizeIconSrc(connector?.icon || iconUrl || undefined)

export const walletIconResolver = (
    _address: string | undefined,
    iconUrl: string | undefined,
): string | undefined => normalizeIconSrc(iconUrl || undefined)
