'use client'
import { WalletConnectionProvider } from '@layerswap/widget/types';
import { useWalletStore, useWalletProviders, useSettingsState } from '@layerswap/widget/internal';
import { Context, FC, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { paradexConnectionAdapter } from './service/paradexConnectionAdapter';

type ActiveAccountState = {
    activeConnection?: Account
    setActiveAddress: (account: Account) => void
    evmConnectionProvider: WalletConnectionProvider | undefined
    starknetConnectionProvider: WalletConnectionProvider | undefined
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

export const ActiveParadexAccountProvider: FC<Props> = ({ children }) => {
    const [selectedAccount, setSelectedAccount] = useState<Account>()

    const walletProviders = useWalletProviders()
    const evmConnectionProvider = walletProviders.find(p => p.id === 'evm')
    const starknetConnectionProvider = walletProviders.find(p => p.id === 'starknet')
    const paradexAccounts = useWalletStore((state) => state.paradexAccounts)
    const activeConnection: Account | undefined = useMemo(() => {
        if (!paradexAccounts) return undefined
        const l1Addresses = Object.keys(paradexAccounts || {})
        const selectedProvider = selectedAccount && (selectedAccount.providerName === "EVM" ? evmConnectionProvider : starknetConnectionProvider);
        const selectedAccountIsAvailable = selectedAccount && selectedProvider?.connectedWallets?.some(w => w.id === selectedAccount.id && w.addresses.some(wa => wa.toLowerCase() === selectedAccount.l1Address.toLowerCase()));
        if (selectedAccountIsAvailable) {
            return selectedAccount;
        }
        else {
            const evmWallet = evmConnectionProvider?.connectedWallets?.find(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
            const starknetWallet = starknetConnectionProvider?.connectedWallets?.find(w => w.addresses.some(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase())))
            const defaultWallet = evmWallet || starknetWallet
            if (!defaultWallet) return undefined
            return {
                id: defaultWallet.id,
                providerName: defaultWallet.providerName as "Starknet" | "EVM",
                l1Address: defaultWallet.addresses.find(wa => l1Addresses.some(pa => pa.toLowerCase() === wa.toLowerCase()))!
            }
        }
    }, [evmConnectionProvider, starknetConnectionProvider, paradexAccounts, selectedAccount])

    const setActiveAddress = useCallback((account: Account) => {
        setSelectedAccount(account)
    }, [])

    const { networks } = useSettingsState()

    return (
        <ActiveParadexAccountContext.Provider value={{ activeConnection, setActiveAddress, evmConnectionProvider, starknetConnectionProvider }}>
            <paradexConnectionAdapter.Hydrator networks={networks} />
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
