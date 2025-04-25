import { FC, createContext, useContext } from "react";
import { WalletProvider } from "../Models/WalletProvider";


type WalletHooksRegistry = Partial<{
    "evm": WalletProvider
}>

export const WalletHooksProviderContext = createContext<WalletHooksRegistry | null>(null);

export const WalletHooksProvider: FC<{
    overides: Partial<WalletHooksRegistry>,
    children?: React.ReactNode
}> = ({ children, overides }) => {
    return (
        <WalletHooksProviderContext.Provider value={overides}>
            {children}
        </WalletHooksProviderContext.Provider>
    );
}

export const useWalletProviderOverrides = () =>
    useContext(WalletHooksProviderContext)