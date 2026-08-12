"use client";
import { useEffect, useState } from "react";
import { useWalletProvidersReady } from "@/context/WalletProvidersRegistryProvider";
import { isProviderConnectReady } from "@/lib/walletConnect/isProviderConnectReady";
import { useWalletProviderSnapshots } from "./useWalletProviderSnapshots";

const SESSION_RESTORE_GRACE_MS = 10_000;

export function useProvidersConnectReady(): boolean {
    const registryReady = useWalletProvidersReady();
    const providers = useWalletProviderSnapshots();

    const awaitingSessionRestore = providers.some(
        provider => provider.isStub === true && provider.pendingSessionRestore === true,
    );
    const [graceExpired, setGraceExpired] = useState(false);

    useEffect(() => {
        if (!awaitingSessionRestore || graceExpired) return;
        const timer = setTimeout(() => setGraceExpired(true), SESSION_RESTORE_GRACE_MS);
        return () => clearTimeout(timer);
    }, [awaitingSessionRestore, graceExpired]);

    return registryReady
        && providers.every(isProviderConnectReady)
        && (!awaitingSessionRestore || graceExpired);
}
