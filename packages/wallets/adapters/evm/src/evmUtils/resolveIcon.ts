import { resolveWalletIconString } from "@layerswap/wallet-core"

export const resolveEVMWalletConnectorIcon = ({ connector, iconUrl }: { connector?: string, iconUrl?: string }): string | undefined => {
    return resolveWalletIconString({ id: connector, iconUrl })
}
