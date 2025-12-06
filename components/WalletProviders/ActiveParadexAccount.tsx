import useEVM from '@/lib/wallets/evm/useEVM';
import useStarknet from '@/lib/wallets/starknet/useStarknet';
import { useWalletStore } from '@/stores/walletStore';
import { Context, FC, createContext, useCallback, useContext, useMemo, useState } from 'react';

type ActiveAccountState = {
    activeConnection?: Account
    setActiveAddress: (account: Account) => void
}

export const ActiveParadexAccountContext = createContext<ActiveAccountState | undefined>(undefined);

type Account = {
    id: string
    l1Address: string,
    providerName: "Starknet" | "EVM"
}

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const ActiveParadexAccountProvider: FC<Props> = ({ children }) => {
    const [selectedAccount, setSelectedAccount] = useState<Account>()
    const evmProvider = useEVM()
    const starknetProvider = useStarknet()
    const paradexAccounts = useWalletStore((state) => state.paradexAccounts)
    const activeConnection: Account | undefined = useMemo(() => {
        if (!paradexAccounts) return undefined
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
        <ActiveParadexAccountContext.Provider value={{ activeConnection, setActiveAddress }}>
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