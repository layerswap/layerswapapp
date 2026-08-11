import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_ANALYTICS_NETWORK = "IMMUTABLEZK_MAINNET";

interface AnalyticsNetworkState {
    networkName: string;
    setNetworkName: (networkName: string) => void;
}

export const useAnalyticsNetworkStore = create<AnalyticsNetworkState>()(
    persist(
        (set) => ({
            networkName: DEFAULT_ANALYTICS_NETWORK,
            setNetworkName: (networkName) => set({ networkName }),
        }),
        { name: "explorer-analytics-network" }
    )
);
