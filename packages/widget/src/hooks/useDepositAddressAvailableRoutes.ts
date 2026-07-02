import { useMemo } from "react";
import { NetworkRoute } from "@/Models/Network";
import useDepositAddressSources from "@/hooks/useDepositAddressSources";

// Shares the same SWR key as `useAutoSourceRoute` so both callers reuse one cached request.
export default function useDepositAddressAvailableRoutes(destinationNetwork: string | undefined, destinationToken: string | undefined) {
    const { data } = useDepositAddressSources({ destinationNetwork, destinationToken });
    const availableRoutes: NetworkRoute[] = useMemo(() => {
        const routes = data?.data;
        if (!routes) return [];
        return routes
            .map(route => ({ ...route, tokens: route.tokens?.filter(t => t.status === 'active') ?? [] }))
            .filter(route => route.tokens.length > 0);
    }, [data]);
    return { availableRoutes };
}
