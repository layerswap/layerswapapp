import { useEffect, useState } from "react";

const PROVIDER_SETTLE_TIMEOUT_MS = 5000;

/**
 * Keep the connector grid hidden while providers initialize, but preserve the
 * existing bounded fallback so one failed provider cannot block the modal
 * forever.
 */
export function useProviderLoadingGate(providersSettled: boolean): boolean {
    const [settleTimedOut, setSettleTimedOut] = useState(false);

    useEffect(() => {
        if (providersSettled) return;
        const timer = setTimeout(
            () => setSettleTimedOut(true),
            PROVIDER_SETTLE_TIMEOUT_MS,
        );
        return () => clearTimeout(timer);
    }, [providersSettled]);

    return !providersSettled && !settleTimedOut;
}
