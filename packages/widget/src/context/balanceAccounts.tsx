import { Context, createContext, useCallback, useContext, useMemo, useState } from 'react'
import useWallet from '@/hooks/useWallet';
import { Wallet, WalletProvider } from '@/Models/WalletProvider';
import AddressIcon from '@/components/Common/AddressIcon';
import { SwapDirection } from '@/components/Pages/Swap/Form/SwapFormValues';
import { getKey, useBalanceStore, BalanceEntry } from '@/stores/balanceStore';

const BalanceAccountsStateContext = createContext<BalanceAccountsContextType | null>(null);
const BalanceAccountsUpdateContext = createContext<BalanceAccountsUpdateContextType | null>(null);

type PickerAccountsProviderProps = {
    children: React.ReactNode;
}

type BalanceAccountsContextType = {
    sourceAccounts: AccountIdentityWithSupportedNetworks[];
    destinationAccounts: (AccountIdentity | AccountIdentityWithSupportedNetworks)[];
}

type BalanceAccountsUpdateContextType = {
    selectDestinationAccount: (account: BaseAccountIdentity) => void;
    selectSourceAccount: (account: BaseAccountIdentity) => void;
}

type BaseAccountIdentity = {
    address: string;
    providerName: string;
    id: string;
}

export type AccountIdentity = BaseAccountIdentity & {
    displayName: string,
    addresses: string[],
    provider: WalletProvider;
    icon: (props: any) => React.JSX.Element;
}


export type AccountIdentityWithSupportedNetworks = AccountIdentity & {
    walletWithdrawalSupportedNetworks: Wallet['withdrawalSupportedNetworks'];
    walletAutofillSupportedNetworks: Wallet['autofillSupportedNetworks'];
    walletAsSourceSupportedNetworks: Wallet['asSourceSupportedNetworks'];
}
export function BalanceAccountsProvider({ children }: PickerAccountsProviderProps) {

    const [selectedDestAccounts, setSelectedDestinationAccounts] = useState<BaseAccountIdentity[]>([])
    const [selectedSourceAccounts, setSelectedSourceAccounts] = useState<BaseAccountIdentity[]>([])
    const { providers } = useWallet()

    const sourceAccounts: AccountIdentityWithSupportedNetworks[] = useMemo(() => {
        return providers.map(provider => {
            if (!hasWallet(provider)) return null;

            const selectedWallet = provider.connectedWallets?.find(wallet => wallet.id === selectedSourceAccounts.find(acc =>
                acc.providerName === provider.name && wallet.addresses.some(a => a === acc.address))?.id && wallet.addresses)

            const wallet = selectedWallet || provider.activeWallet;
            const selectedAccountAddress = selectedWallet ? selectedSourceAccounts.find(acc => acc.providerName === provider.name && acc.id === selectedWallet.id)?.address : undefined
            const address = selectedAccountAddress ? selectedAccountAddress : wallet.address;


            const res = ResolveWalletBalanceAccount(provider, wallet, address);

            if (!selectedAccountAddress) {
                setSelectedSourceAccounts(prev => {
                    const existingAccountIndex = prev.findIndex(acc => acc.providerName === res.providerName);
                    if (existingAccountIndex !== -1) {
                        const updatedAccounts = [...prev];
                        updatedAccounts[existingAccountIndex] = res;
                        return updatedAccounts;
                    }
                    return [...prev, res];
                });
            }
            
            return res
        }).filter(Boolean) as AccountIdentityWithSupportedNetworks[];
    }, [providers, selectedSourceAccounts])

    const destinationAccounts: AccountIdentity[] = useMemo(() => {
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
        }).filter(Boolean) as AccountIdentity[];
    }, [providers, selectedDestAccounts]);

    const selectDestinationAccount = useCallback((account: BaseAccountIdentity) => {
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
    const selectSourceAccount = useCallback((account: BaseAccountIdentity) => {
        const previousSourceAccount = sourceAccounts.find(acc => acc.providerName === account.providerName);
        if (destinationAccounts.some(acc => acc.address === previousSourceAccount?.address && acc.providerName === previousSourceAccount?.providerName)) {
            selectDestinationAccount(account);
        }
        setSelectedSourceAccounts(prev => {
            const existingAccountIndex = prev.findIndex(acc => acc.providerName === account.providerName);
            if (existingAccountIndex !== -1) {
                const updatedAccounts = [...prev];
                updatedAccounts[existingAccountIndex] = account;
                return updatedAccounts;
            }
            return [...prev, account];
        });
    }, [destinationAccounts, sourceAccounts])

    const stateValues: BalanceAccountsContextType = useMemo(() => ({
        sourceAccounts,
        destinationAccounts
    }), [sourceAccounts, destinationAccounts]);

    const update: BalanceAccountsUpdateContextType = useMemo(() => ({
        selectDestinationAccount,
        selectSourceAccount,
    }), [sourceAccounts, destinationAccounts, selectSourceAccount, selectDestinationAccount]);

    return (
        <BalanceAccountsStateContext.Provider value={stateValues}>
            <BalanceAccountsUpdateContext.Provider value={update}>
                {children}
            </BalanceAccountsUpdateContext.Provider>
        </BalanceAccountsStateContext.Provider>
    )
}
export function useBalanceAccounts(direction: "from"): AccountIdentityWithSupportedNetworks[];
export function useBalanceAccounts(direction: "to"): AccountIdentity[];
export function useBalanceAccounts(direction: SwapDirection): (AccountIdentity | AccountIdentityWithSupportedNetworks)[];
export function useBalanceAccounts(direction: SwapDirection) {
    const values = useContext<BalanceAccountsContextType>(BalanceAccountsStateContext as Context<BalanceAccountsContextType>);

    if (values === undefined) {
        throw new Error('useBalanceAccounts must be used within a BalanceAccountsProvider');
    }
    return direction === "from" ? values.sourceAccounts : values.destinationAccounts;
}

export function useSelectedAccount(direction: "from", networkName: string | undefined): AccountIdentityWithSupportedNetworks | undefined;
export function useSelectedAccount(direction: "to", networkName: string | undefined): AccountIdentity | undefined;
export function useSelectedAccount(direction: SwapDirection, networkName: string | undefined): AccountIdentity | AccountIdentityWithSupportedNetworks | undefined;
export function useSelectedAccount(direction: SwapDirection, networkName: string | undefined) {
    const values = useContext<BalanceAccountsContextType>(BalanceAccountsStateContext as Context<BalanceAccountsContextType>);
    if (!networkName) return undefined;
    if (values === undefined) {
        throw new Error('useBalanceAccounts must be used within a BalanceAccountsProvider');
    }
    return direction === "from" ? values.sourceAccounts.find(acc => acc.walletWithdrawalSupportedNetworks?.some(n => n === networkName))
        :
        values.destinationAccounts.find(acc => {
            if ('walletAutofillSupportedNetworks' in acc) {
                return acc.walletAutofillSupportedNetworks?.some(n => n === networkName)
            }
            return acc.provider?.autofillSupportedNetworks?.some(n => n === networkName)
        });
}

export function useNetworkBalanceKey(direction: SwapDirection, networkName: string | undefined) {
    const account = useSelectedAccount(direction, networkName);
    if (!account || !networkName) return undefined;
    return getKey(account.address, networkName);
}

export function useNetworkBalance(direction: SwapDirection, networkName: string | undefined): BalanceEntry | undefined {
    const balanceKey = useNetworkBalanceKey(direction, networkName);
    const balance = useBalanceStore((s) => (s.isLoading ? undefined : s.balances[balanceKey || "unknown"]));
    return balance;
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

function ResolveWalletBalanceAccount(provider: WalletProvider, wallet: Wallet, address: string): AccountIdentityWithSupportedNetworks {
    return {
        address,
        provider,
        providerName: provider.name,
        id: wallet.id,
        walletWithdrawalSupportedNetworks: wallet.withdrawalSupportedNetworks,
        walletAutofillSupportedNetworks: wallet.autofillSupportedNetworks,
        walletAsSourceSupportedNetworks: wallet.asSourceSupportedNetworks,
        displayName: wallet.displayName || provider.name,
        addresses: wallet.addresses || [address],
        icon: wallet.icon || ((props) => <AddressIcon address={address} size={24} {...props} />),
    }
}

function ResolveManualBalanceAccount(provider: WalletProvider, address: string): AccountIdentity {
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