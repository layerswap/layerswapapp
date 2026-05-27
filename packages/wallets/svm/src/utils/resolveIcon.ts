import { resolveWalletIconString } from "@layerswap/widget/internal"

export const resolveSolanaWalletConnectorIcon = ({ connector, iconUrl }: { connector?: string, address?: string, iconUrl?: string }): string | undefined => {
    return resolveWalletIconString({ id: connector, iconUrl })
}
