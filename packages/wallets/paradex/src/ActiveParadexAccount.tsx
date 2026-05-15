'use client'
import { WalletConnectionProvider } from '@layerswap/widget/types';
import {
    useWalletStore,
    useWalletConnectionProviderById,
} from '@layerswap/widget/internal';
import { Context, FC, createContext, useCallback, useContext, useMemo, useState } from 'react';

type ActiveAccountState = {
    activeConnection?: Account
    setActiveAddress: (account: Account) => void
    evmProvider: WalletConnectionProvider | undefined
    starknetProvider: WalletConnectionProvider | undefined
}

export const ActiveParadexAccountContext = createContext<ActiveAccountState | undefined>(undefined);

type Account = {
    id: string
    l1Address: string,
    providerName: "Starknet" | "EVM"
}

type Props = {
    children?: React.ReactNode;
}

// Pre-shell migration this component called EVM's and Starknet's
// `walletConnectionProvider({ networks })` hooks inline. That was both a
// duplicated subscription to wagmi/starknet-react state *and* a Rules of
// Hooks landmine across the conditional length of the legacy
// walletProviders array. The new model: each chain's shell registrar
// calls its connection hook once and writes the resolved provider into
// the registry; Paradex reads from the registry. First-render gap (when
// EVM/Starknet shells haven't yet committed their effects) is tolerated
// — `activeConnection` resolves to undefined until both providers
// register, which matches the existing wagmi-reconnect timing anyway.
export const ActiveParadexAccountProvider: FC<Props> = ({ children }) => {
    const [selectedAccount, setSelectedAccount] = useState<Account>()

    const evmProvider = useWalletConnectionProviderById('evm')
    const starknetProvider = useWalletConnectionProviderById('starknet')
    const paradexAccounts = useWalletStore((state) => state.paradexAccounts)
    const activeConnection: Account | undefined = useMemo(() => {
        if (!paradexAccounts) return undefined
        if (!evmProvider || !starknetProvider) return undefined
        const l1Addresses = Object.keys(paradexAccounts || {})
        const selectedProvider = selectedAccount && (selectedAccount.providerName === "EVM" ? evmProvider : starknetProvider);
        const selectedAccountIsAvailable = selectedAccount && selectedProvider?.connectedWallets?.some(w => w.id === selectedAccount.id && w.addresses.some(wa => wa.toLowerCase() === selectedAccount.l1Address.toLowerCase()));
        if (selectedAccountIsAvailable) {
            return selectedAccount;
        }
        else {
            const evmWallet = evmProvider.connectedWallets?.find(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
            const starknetWallet = starknetProvider.connectedWallets?.find(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
            const defaultWallet = evmWallet || starknetWallet
            if (!defaultWallet) return undefined
            return {
                id: defaultWallet.id,
                providerName: defaultWallet.providerName as "Starknet" | "EVM",
                l1Address: defaultWallet.addresses.find(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase()))!
            }
        }
    }, [evmProvider, starknetProvider, paradexAccounts, selectedAccount])

    const setActiveAddress = useCallback((account: Account) => {
        setSelectedAccount(account)
    }, [])

    return (
        <ActiveParadexAccountContext.Provider value={{ activeConnection, setActiveAddress, evmProvider, starknetProvider }}>
            {children}
        </ActiveParadexAccountContext.Provider>
    )
}

export function useActiveParadexAccount() {
    const data = useContext(ActiveParadexAccountContext as Context<ActiveAccountState>)
    if (!data) {
        throw new Error('useActiveParadexAccount must be used within a ActiveParadexAccountProvider')
    }
    return data
}
