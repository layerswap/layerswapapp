import { Context, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Network } from '@/Models/Network';
import { SwapDirection } from '@/components/DTOs/SwapFormValues';
import useWallet from '@/hooks/useWallet';
import { Wallet, WalletProvider } from '@/Models/WalletProvider';
import AddressIcon from '@/components/AddressIcon';

const BalanceAccountsStateContext = createContext<BalanceAccountsContextType | null>(null);
const BalanceAccountsUpdateContext = createContext<BalanceAccountsUpdateContextType | null>(null);

type PickerAccountsProviderProps = {
    children: React.ReactNode;
}

type BalanceAccountsContextType = {
    sourceAccounst: BalanceAccount[];
    destinationAccounts: BalanceAccount[];
}

type BalanceAccountsUpdateContextType = {
    selectDestinationAccount: (account: SelectedAccountBase) => void;
    selectSourceAccount: (account: SelectedAccountBase) => void;
}

type SelectedAccountBase = {
    address: string;
    providerName: string;
    id: string;
}

export type BalanceAccount = SelectedAccountBase & {
    displayName: string,
    addresses: string[],
    provider: WalletProvider;
    icon: (props: any) => React.JSX.Element;
}

export function BalanceAccountsProvider({ children }: PickerAccountsProviderProps) {

    const [selectedDestAccounts, setSelectedDestinationAccounts] = useState<SelectedAccountBase[]>([])

    const { providers } = useWallet()

    const sourceAccounst: BalanceAccount[] = useMemo(() => {
        return providers.filter(hasWallet).map(provider => ResolveWalletBalanceAccount(provider, provider.activeWallet, provider.activeWallet.address))
    }, [providers])

    const destinationAccounts: BalanceAccount[] = useMemo(() => {
        return providers.map(provider => {
            const manuallyAdded = selectedDestAccounts.find(
                acc => acc.providerName === provider.name && acc.id === 'manually_added'
            );

            if (manuallyAdded) {
                return ResolveManualBalanceAccount(provider, manuallyAdded.address);
            }

            if (!hasWallet(provider)) return null;

            const selectedWallet = provider.connectedWallets?.find(wallet => wallet.id === selectedDestAccounts.find(acc =>
                acc.providerName === provider.name && wallet.addresses.some(a => a === acc.address))?.id && wallet.addresses)

            const wallet = selectedWallet || provider.activeWallet;
            const selectedAccountAddress = selectedWallet ? selectedDestAccounts.find(acc => acc.providerName === provider.name && acc.id === selectedWallet.id)?.address : undefined
            const address = selectedAccountAddress ? selectedAccountAddress : wallet.address;

            return ResolveWalletBalanceAccount(provider, wallet, address);
        }).filter(Boolean) as BalanceAccount[];
    }, [providers, selectedDestAccounts]);

    const selectDestinationAccount = useCallback((account: SelectedAccountBase) => {
        setSelectedDestinationAccounts(prev => {
            const existingAccountIndex = prev.findIndex(acc => acc.providerName === account.providerName);
            if (existingAccountIndex !== -1) {
                const updatedAccounts = [...prev];
                updatedAccounts[existingAccountIndex] = account;
                return updatedAccounts;
            }
            return [...prev, account];
        });
    }, [])

    const selectSourceAccount = useCallback((account: SelectedAccountBase) => {
        const provider = providers.find(p => p.name === account.providerName);
        if (provider && provider.activeWallet && provider.activeWallet.address !== account.address) {
            provider.switchAccount?.(provider.activeWallet, account.address);
        }
    }, [providers])


    const stateValues: BalanceAccountsContextType = useMemo(() => ({
        sourceAccounst,
        destinationAccounts,
        selectDestinationAccount,
        selectSourceAccount
    }), [sourceAccounst, destinationAccounts]);

    const update: BalanceAccountsUpdateContextType = useMemo(() => ({
        selectDestinationAccount,
        selectSourceAccount,
    }), [selectDestinationAccount, selectSourceAccount]);

    return (
        <BalanceAccountsStateContext.Provider value={stateValues}>
            <BalanceAccountsUpdateContext.Provider value={update}>
                {children}
            </BalanceAccountsUpdateContext.Provider>
        </BalanceAccountsStateContext.Provider>
    )
}

export function useBalanceAccounts(direction: SwapDirection) {
    const values = useContext<BalanceAccountsContextType>(BalanceAccountsStateContext as Context<BalanceAccountsContextType>);

    if (values === undefined) {
        throw new Error('useBalanceAccounts must be used within a BalanceAccountsProvider');
    }
    return direction === "from" ? values.sourceAccounst : values.destinationAccounts;
}



export function useUpdateBalanceAccount(direction: SwapDirection) {
    const values = useContext<BalanceAccountsUpdateContextType>(BalanceAccountsUpdateContext as Context<BalanceAccountsUpdateContextType>);

    if (values === undefined) {
        throw new Error('useUpdateBalanceAccount must be used within a BalanceAccountsUpdateContext');
    }
    return direction === "from" ? values.selectSourceAccount : values.selectDestinationAccount;
}

function hasWallet(
    p: WalletProvider
): p is WalletProvider & { activeWallet: { address: string; id: string } } {
    return Boolean(p.activeWallet);
}

function ResolveWalletBalanceAccount(provider: WalletProvider, wallet: Wallet, address: string): BalanceAccount {
    return {
        address,
        provider,
        providerName: provider.name,
        id: wallet.id,
        displayName: wallet.displayName || provider.name,
        addresses: wallet.addresses || [address],
        icon: wallet.icon || ((props) => <AddressIcon address={address} size={24} {...props} />),
    }
}

function ResolveManualBalanceAccount(provider: WalletProvider, address: string): BalanceAccount {
    return {
        address,
        provider,
        providerName: provider.name,
        id: 'manually_added',
        displayName: "Manual",
        addresses: [address],
        icon: (props: any) => (
            <AddressIcon className="h-4 w-4 p-0.5" address={address} size={20} {...props} />
        ),
    };
}