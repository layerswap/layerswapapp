'use client'
import { FC, ReactNode, createElement, useEffect, useMemo, createContext, useContext } from "react"
import { ThemeData } from "@/Models/Theme"
import { WalletProvidersProvider } from "@/context/walletProviders";
import { WalletModalProvider } from "../WalletModal";
import { WalletProvider, WalletWrapper } from "@/types"

const DynamicProviderWrapper: FC<{
    providers: WalletWrapper[],
    children: ReactNode,
    themeData: ThemeData,
    appName: string | undefined
}> = ({ providers, children, themeData, appName }) => {
    const createNestedProviders = (providers: WalletWrapper[], currentChildren: ReactNode): ReactNode => {
        if (providers.length === 0) return currentChildren;

        const [currentProvider, ...remainingProviders] = providers;

        if (!currentProvider.wrapper) {
            return createNestedProviders(remainingProviders, currentChildren);
        }

        const wrapperProps = { children: createNestedProviders(remainingProviders, currentChildren), themeData, appName };

        return createElement(currentProvider.wrapper, wrapperProps);
    };

    return <>{createNestedProviders(providers, children)}</>;
};

/**
 * WalletsProviders - Dynamically renders wallet provider wrappers and runs
 * one-shot `init` lifecycles for providers that opt out of a React wrapper.
 *
 * Each provider in the array should have:
 * - id: unique identifier
 * - wrapper?: React component to wrap children with (use for upstream
 *   React-only libs that need to live in the tree)
 * - init?: one-shot initializer called once on mount; returned dispose runs
 *   on unmount
 * - createConnection?: external-store factory for connection state
 */
const WalletsProviders: FC<{
    children: ReactNode,
    themeData: ThemeData,
    appName: string | undefined,
    walletProviders: (WalletProvider | WalletWrapper)[]
}> = ({ children, themeData, appName, walletProviders }) => {

    const providersWithConnection = useMemo(
        () => walletProviders.filter(provider => typeof provider === 'object' && 'createConnection' in provider),
        [walletProviders],
    );

    useEffect(() => {
        const disposers: Array<() => void> = []
        for (const p of walletProviders) {
            const init = (p as WalletWrapper).init
            if (typeof init === 'function') {
                const dispose = init({ themeData, appName })
                if (typeof dispose === 'function') disposers.push(dispose)
            }
        }
        return () => disposers.forEach(d => { try { d() } catch { /* swallow */ } })
        // themeData/appName are stable per LayerswapProvider mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletProviders])

    return (
        <WalletProvidersListContext.Provider value={walletProviders}>
            <WalletModalProvider>
                <DynamicProviderWrapper
                    providers={walletProviders}
                    themeData={themeData}
                    appName={appName}
                >
                    <WalletProvidersProvider walletProviders={providersWithConnection as WalletProvider[]}>
                        {children}
                    </WalletProvidersProvider>
                </DynamicProviderWrapper>
            </WalletModalProvider>
        </WalletProvidersListContext.Provider>
    )
}

export default WalletsProviders

export const WalletProvidersListContext = createContext<(WalletProvider | WalletWrapper)[]>([])
export const useWalletProvidersList = () => useContext(WalletProvidersListContext)
