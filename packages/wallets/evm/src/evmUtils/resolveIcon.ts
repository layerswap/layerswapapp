import { resolveWalletIconString } from "@layerswap/widget/internal"

export const resolveEVMWalletConnectorIcon = ({ connector, name, iconUrl }: { connector?: string, name?: string, iconUrl?: string }): string | undefined => {
    return resolveWalletIconString({ id: connector, name, iconUrl })
}
