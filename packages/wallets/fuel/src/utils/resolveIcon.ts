import { resolveWalletIconString } from "@layerswap/ui-kit"

export const resolveFuelWalletConnectorIcon = ({ connector, iconUrl }: { connector?: string, address?: string, iconUrl?: string }): string | undefined => {
    return resolveWalletIconString({ id: connector, iconUrl })
}
