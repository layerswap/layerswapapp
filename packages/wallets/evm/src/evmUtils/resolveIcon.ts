import { resolveWalletIconString } from "@layerswap/widget/internal"

export const resolveEVMWalletConnectorIcon = ({ connector, iconUrl }: { connector?: string, iconUrl?: string }): string | undefined => {
    return resolveWalletIconString({ id: connector, iconUrl })
}
