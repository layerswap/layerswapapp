import { useCallback } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";

export type RecentConnector = {
    providerName?: string;
    connectorName?: string;
};

export function useRecentConnectors() {
    const [recentConnectors, setRecentConnectors] = usePersistedState<
        RecentConnector[]
    >([], "recentConnectors", "localStorage");

    const rememberConnector = useCallback(
        (providerName: string, connectorName: string) => {
            setRecentConnectors((previous) => {
                const next: RecentConnector[] = [
                    { providerName, connectorName },
                ];
                const counts = new Map<string, number>([[providerName, 1]]);

                for (const item of previous || []) {
                    if (
                        !item.providerName ||
                        !item.connectorName ||
                        (item.providerName === providerName &&
                            item.connectorName === connectorName)
                    ) {
                        continue;
                    }

                    const count = counts.get(item.providerName) ?? 0;
                    if (count < 3) {
                        next.push(item);
                        counts.set(item.providerName, count + 1);
                    }
                }
                return next;
            });
        },
        [setRecentConnectors],
    );

    return { recentConnectors, rememberConnector };
}
