'use client'
import { FC, ReactNode, createElement } from "react"
import { ThemeData } from "@/Models/Theme"
import { WalletProvidersProvider } from "@/context/walletProviders";
import { WalletModalProvider } from "../WalletModal";
import AppSettings from "@/lib/AppSettings";
import { WalletProvider } from "@/context/LayerswapProvider"

// Dynamic wrapper component that renders provider wrappers
const DynamicProviderWrapper: FC<{
    providers: WalletProvider[],
    children: ReactNode,
    basePath: string,
    themeData: ThemeData,
    appName: string | undefined
}> = ({ providers, children, basePath, themeData, appName }) => {
    // Create a nested structure of providers
    const createNestedProviders = (providers: WalletProvider[], currentChildren: ReactNode): ReactNode => {
        if (providers.length === 0) return currentChildren;

        const [currentProvider, ...remainingProviders] = providers;

        if (!currentProvider.wrapper) {
            return createNestedProviders(remainingProviders, currentChildren);
        }

        // Handle special cases for providers that need specific props
        let wrapperProps: any = { children: createNestedProviders(remainingProviders, currentChildren) };

        if (currentProvider.id === 'ton') {
            wrapperProps = { ...wrapperProps, basePath, themeData, appName };
        } else if (currentProvider.id === 'imtbl') {
            wrapperProps = {
                ...wrapperProps,
                client_id: AppSettings.ImtblPassportConfig?.clientId,
                publishable_key: AppSettings.ImtblPassportConfig?.publishableKey,
                redirect_uri: AppSettings.ImtblPassportConfig?.redirectUri,
                base_path: AppSettings.ImtblPassportConfig?.appBasePath
            };
        }

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
    walletProviders: WalletProvider[]
}> = ({ children, basePath, themeData, appName, walletProviders }) => {
    return (
        <DynamicProviderWrapper
            providers={walletProviders}
            basePath={basePath}
            themeData={themeData}
            appName={appName}
        >
            <WalletModalProvider>
                <WalletProvidersProvider walletProviders={walletProviders}>
                    {children}
                </WalletProvidersProvider>
            </WalletModalProvider>
        </DynamicProviderWrapper>
    )
}

export default WalletsProviders