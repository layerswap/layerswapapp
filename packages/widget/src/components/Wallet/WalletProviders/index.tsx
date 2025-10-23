'use client'
import { FC, ReactNode, createElement, useMemo } from "react"
import { ThemeData } from "@/Models/Theme"
import { WalletProvidersProvider } from "@/context/walletProviders";
import { WalletModalProvider } from "../WalletModal";
import { WalletProvider, WalletWrapper } from "@/types"

const DynamicProviderWrapper: FC<{
    providers: WalletWrapper[],
    children: ReactNode,
    basePath: string,
    themeData: ThemeData,
    appName: string | undefined
}> = ({ providers, children, basePath, themeData, appName }) => {
    const createNestedProviders = (providers: WalletWrapper[], currentChildren: ReactNode): ReactNode => {
        if (providers.length === 0) return currentChildren;

        const [currentProvider, ...remainingProviders] = providers;

        if (!currentProvider.wrapper) {
            return createNestedProviders(remainingProviders, currentChildren);
        }

        const wrapperProps = { children: createNestedProviders(remainingProviders, currentChildren), basePath, themeData, appName };

        return createElement(currentProvider.wrapper, wrapperProps);
    };

    return <>{createNestedProviders(providers, children)}</>;
};

/**
 * WalletsProviders - Dynamically renders wallet provider wrappers
 * 
 * This component can now accept custom walletProviders that define which wrappers to use.
 * Each provider in the array should have:
 * - id: unique identifier
 * - wrapper: React component to wrap children with
 * - walletConnectionProvider, gasProvider, balanceProvider: optional provider implementations
 * 
 * Example usage:
 * const customProviders = [
 *   { id: 'ton', wrapper: TonConnectProvider },
 *   { id: 'evm', wrapper: EVMProvider },
 *   { id: 'custom', wrapper: MyCustomProvider }
 * ];
 * 
 * <WalletsProviders walletProviders={customProviders} ...>
 *   {children}
 * </WalletsProviders>
 */
const WalletsProviders: FC<{
    children: ReactNode,
    basePath: string,
    themeData: ThemeData,
    appName: string | undefined,
    walletProviders: (WalletProvider | WalletWrapper)[]
}> = ({ children, basePath, themeData, appName, walletProviders }) => {

    const providersWithWalletConnectionProvider = useMemo(() => walletProviders.filter(provider => typeof provider === 'object' && 'walletConnectionProvider' in provider), [walletProviders]);

    return (
        <DynamicProviderWrapper
            providers={walletProviders}
            basePath={basePath}
            themeData={themeData}
            appName={appName}
        >
            <WalletModalProvider>
                <WalletProvidersProvider walletProviders={providersWithWalletConnectionProvider}>
                    {children}
                </WalletProvidersProvider>
            </WalletModalProvider>
        </DynamicProviderWrapper>
    )
}

export default WalletsProviders