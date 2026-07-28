import type {
    WalletConnectionProvider,
    WalletModalConnector,
} from "@/types/wallet";

export type RecentConnector = {
    providerName?: string;
    connectorName?: string;
}

export const rememberConnector = (
    previous: RecentConnector[],
    provider: WalletConnectionProvider,
    connector: WalletModalConnector
) => {
    const next: RecentConnector[] = [{
        providerName: provider.name,
        connectorName: connector.name,
    }]
    const counts = new Map<string, number>([[provider.name, 1]])

    for (const item of previous || []) {
        if (
            !item.providerName
            || !item.connectorName
            || (
                item.providerName === provider.name
                && item.connectorName === connector.name
            )
        ) {
            continue
        }

        const count = counts.get(item.providerName) ?? 0
        if (count < 3) {
            next.push({
                providerName: item.providerName,
                connectorName: item.connectorName,
            })
            counts.set(item.providerName, count + 1)
        }
    }

    return next
}

export const getConnectionError = (error: any) => {
    const message = (error?.message || error?.details || "").toLowerCase()

    if (
        error?.name === "WalletWindowClosedError"
        || message.includes("rejected")
        || message.includes("denied")
    ) {
        return "You've declined the wallet connection request"
    }

    return error?.message || error?.details || "Something went wrong"
}
