import React, { createContext, useContext, useEffect, useState } from "react";
import { resolverService } from "@/lib/resolvers/resolverService";
import { useRegisteredWalletProviders } from "./walletConnectionRegistry";

type ResolverContextType = {
    isInitialized: boolean;
};

const ResolverContext = createContext<ResolverContextType | null>(null);

// Pre-shell migration this component called every chain's transferProvider
// hook from a `.map` over a runtime-variable array — same conditional-hook
// landmine that lived in WalletProvidersProvider. The fix is symmetric:
// each chain's shell registrar already called its transfer hook(s) inside
// its own (fixed-shape) component and stashed the resolved `TransferProvider`
// objects on the RegisteredWalletProvider entry. Here we just collect the
// already-resolved arrays — no hooks called over arbitrary-length arrays.
export const ResolverProviders: React.FC<React.PropsWithChildren> = ({ children }) => {
    const registered = useRegisteredWalletProviders()
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
        const transferProviders = registered.flatMap(p => p.transferProviders)
        const balanceProviders = registered.flatMap(p => p.balanceProviders)
        const gasProviders = registered.flatMap(p => p.gasProviders)
        const addressUtilsProviders = registered.flatMap(p => p.addressUtilsProviders)
        const nftProviders = registered.flatMap(p => p.nftProviders)
        const contractAddressProviders = registered.flatMap(p => p.contractAddressProviders)
        const rpcHealthCheckProviders = registered.flatMap(p => p.rpcHealthCheckProviders)

        resolverService.setProviders(
            balanceProviders,
            gasProviders,
            addressUtilsProviders,
            nftProviders,
            transferProviders,
            contractAddressProviders,
            rpcHealthCheckProviders,
        )
        setIsInitialized(true)
    }, [registered])

    return (
        <ResolverContext.Provider value={{ isInitialized }}>
            {children}
        </ResolverContext.Provider>
    );
};

export const useResolvers = () => {
    const context = useContext(ResolverContext);
    if (!context) {
        throw new Error('useResolvers must be used within a ResolverProvider');
    }
    return context;
};
