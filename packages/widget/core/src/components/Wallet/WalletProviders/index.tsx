'use client'
import { FC, ReactNode, createElement, useMemo, createContext, useContext } from "react"
import { WalletProvidersProvider } from "@/context/walletProviders";
import { useWalletProviderInits } from "./useWalletProviderInits";
import { WalletModalProvider } from "../WalletModal";
import { WidgetWalletListAdapters } from "../WalletComponents/walletListAdapters";
import type { WalletProvider, WalletProviderDescriptor, WalletWrapper } from "@layerswap/wallet-core/types"
import { isWalletProviderDescriptor } from "@layerswap/wallet-core/types"

const DynamicProviderWrapper: FC<{
    providers: WalletWrapper[],
    children: ReactNode,
    appName: string | undefined
}> = ({ providers, children, appName }) => {
    const createNestedProviders = (providers: WalletWrapper[], currentChildren: ReactNode): ReactNode => {
        if (providers.length === 0) return currentChildren;

        const [currentProvider, ...remainingProviders] = providers;

        if (!currentProvider.wrapper) {
            return createNestedProviders(remainingProviders, currentChildren);
        }

        const wrapperProps = { children: createNestedProviders(remainingProviders, currentChildren), appName };

        return createElement(currentProvider.wrapper, wrapperProps);
    };

    return <>{createNestedProviders(providers, children)}</>;
};

/**
 * WalletsProviders - Dynamically renders wallet provider wrappers and runs
 * one-shot `init` lifecycles for providers that opt out of a React wrapper.
 *
 * Each entry in the array may be:
 * - a `WalletProvider`/`WalletWrapper` instance (eager — applied immediately)
 * - a `WalletProviderDescriptor` (lazy — passed through, hydrated by
 *   `DescriptorHydrationBoundary` upstream when the real provider is needed).
 *
 * Descriptors are filtered out before any consumer that requires runtime
 * provider data (`init`, `wrapper`, `createConnection`). They appear in the
 * list context so connector enumeration can see the descriptor id.
 */
const WalletsProviders: FC<{
    children: ReactNode,
    appName: string | undefined,
    walletProviders: (WalletProvider | WalletWrapper | WalletProviderDescriptor)[]
}> = ({ children, appName, walletProviders }) => {

    const realProviders = useMemo(
        () => walletProviders.filter((p): p is WalletProvider | WalletWrapper => !isWalletProviderDescriptor(p)),
        [walletProviders],
    );

    useWalletProviderInits(realProviders, appName)

    return (
        <WalletProvidersListContext.Provider value={walletProviders}>
            <WalletModalProvider>
                <DynamicProviderWrapper
                    providers={realProviders}
                    appName={appName}
                >
                    <WidgetWalletListAdapters>
                        <WalletProvidersProvider walletProviders={walletProviders}>
                            {children}
                        </WalletProvidersProvider>
                    </WidgetWalletListAdapters>
                </DynamicProviderWrapper>
            </WalletModalProvider>
        </WalletProvidersListContext.Provider>
    )
}

export default WalletsProviders

export const WalletProvidersListContext = createContext<(WalletProvider | WalletWrapper | WalletProviderDescriptor)[]>([])
export const useWalletProvidersList = () => useContext(WalletProvidersListContext)
