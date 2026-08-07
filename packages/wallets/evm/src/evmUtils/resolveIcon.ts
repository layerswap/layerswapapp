import { resolveWalletIconString } from "@layerswap/ui-kit"

export const resolveEVMWalletConnectorIcon = ({ connector, iconUrl }: { connector?: string, iconUrl?: string }): string | undefined => {
    return resolveWalletIconString({ id: connector, iconUrl })
}
