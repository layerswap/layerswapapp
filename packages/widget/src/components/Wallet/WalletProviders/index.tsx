'use client'
import { FC, ReactNode } from "react"
import { ThemeData } from "@/Models/Theme"
import { WalletProvidersProvider } from "@/context/walletProviders";
import { WalletModalProvider } from "../WalletModal";

// Pre-shell migration this component dynamically wrapped its children
// with a runtime-determined set of chain provider wrappers built from a
// `walletProviders` array. When that array transitioned from [] to
// populated (the deferred-import pattern in apps/bridge), the children's
// position in the React element tree changed and the whole subtree
// remounted. The new model has each chain rendered as a stable JSX shell
// in app code, so this component only owns the modal + the connection-
// registry consumer — both contexts whose identity never changes.
const WalletsProviders: FC<{
    children: ReactNode,
    themeData: ThemeData,
    appName: string | undefined,
}> = ({ children }) => {
    return (
        <WalletModalProvider>
            <WalletProvidersProvider>
                {children}
            </WalletProvidersProvider>
        </WalletModalProvider>
    )
}

export default WalletsProviders
