import { Context, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { SwapDirection } from '@/components/DTOs/SwapFormValues';
import useWallet from '@/hooks/useWallet';
import { Wallet, WalletProvider } from '@/Models/WalletProvider';
import AddressIcon from '@/components/AddressIcon';
import { getKey, useBalanceStore } from '@/stores/balanceStore';

const SwapAccountsStateContext = createContext<SwapAccountsContextType | null>(null);
const SwapAccountsUpdateContext = createContext<SwapAccountsUpdateContextType | null>(null);

type PickerAccountsProviderProps = {
    children: React.ReactNode;
}

type SwapAccountsContextType = {
    sourceAccounts: AccountIdentityWithSupportedNetworks[];
    destinationAccounts: (AccountIdentity | AccountIdentityWithSupportedNetworks)[];
    selectedSourceWalletId: string | undefined;
}

type SwapAccountsUpdateContextType = {
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
export function SwapAccountsProvider({ children }: PickerAccountsProviderProps) {

    const [selectedDestAccounts, setSelectedDestinationAccounts] = useState<BaseAccountIdentity[]>([])
    const [selectedSourceAccounts, setSelectedSourceAccounts] = useState<BaseAccountIdentity[]>([])
    const [selectedSourceWalletId, setSelectedSourceWalletId] = useState<string | undefined>(undefined)
    const { providers } = useWallet()

    const sourceAccounts: AccountIdentityWithSupportedNetworks[] = useMemo(() => {
        return providers.flatMap(provider => {
            if (!hasWallet(provider)) return [];

            const connectedWallets = provider.connectedWallets || [];

            return connectedWallets.map(wallet => {
                const selectedAccount = selectedSourceAccounts.find(acc =>
                    acc.providerName === provider.name && acc.id === wallet.id
                );
                const address = selectedAccount?.address || wallet.address;

                return ResolveWalletSwapAccount(provider, wallet, address);
            });
        });
    }, [providers, selectedSourceAccounts])

    const destinationAccounts: AccountIdentity[] = useMemo(() => {
        return providers.map(provider => {
            const manuallyAdded = selectedDestAccounts.find(
                acc => acc.providerName === provider.name && acc.id === 'manually_added'
            );

            if (manuallyAdded) {
                return ResolveManualSwapAccount(provider, manuallyAdded.address);
            }

            if (!hasWallet(provider)) return null;

            const selectedWallet = provider.connectedWallets?.find(wallet => wallet.id === selectedDestAccounts.find(acc =>
                acc.providerName === provider.name && wallet.addresses.some(a => a === acc.address))?.id && wallet.addresses)

            const wallet = selectedWallet || provider.activeWallet;
            const selectedAccountAddress = selectedWallet ? selectedDestAccounts.find(acc => acc.providerName === provider.name && acc.id === selectedWallet.id)?.address : undefined
            const address = selectedAccountAddress ? selectedAccountAddress : wallet.address;

            return ResolveWalletSwapAccount(provider, wallet, address);
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
        const previousSourceAccount = sourceAccounts.find(acc => acc.providerName === account.providerName && acc.id === account.id);
        if (destinationAccounts.some(acc => acc.address === previousSourceAccount?.address && acc.providerName === previousSourceAccount?.providerName)) {
            selectDestinationAccount(account);
        }
        setSelectedSourceWalletId(account.id);
        setSelectedSourceAccounts(prev => {
            const existingAccountIndex = prev.findIndex(acc => acc.providerName === account.providerName && acc.id === account.id);
            if (existingAccountIndex !== -1) {
                const updatedAccounts = [...prev];
                updatedAccounts[existingAccountIndex] = account;
                return updatedAccounts;
            }
            return [...prev, account];
        });
    }, [destinationAccounts, sourceAccounts])

    const stateValues: SwapAccountsContextType = useMemo(() => ({
        sourceAccounts,
        destinationAccounts,
        selectedSourceWalletId
    }), [sourceAccounts, destinationAccounts, selectedSourceWalletId]);

    const update: SwapAccountsUpdateContextType = useMemo(() => ({
        selectDestinationAccount,
        selectSourceAccount,
    }), [sourceAccounts, destinationAccounts, selectSourceAccount, selectDestinationAccount]);

    return (
        <SwapAccountsStateContext.Provider value={stateValues}>
            <SwapAccountsUpdateContext.Provider value={update}>
                {children}
            </SwapAccountsUpdateContext.Provider>
        </SwapAccountsStateContext.Provider>
    )
}
export function useSwapAccounts(direction: "from", network: string): AccountIdentityWithSupportedNetworks | undefined;
export function useSwapAccounts(direction: "from"): AccountIdentityWithSupportedNetworks[];
export function useSwapAccounts(direction: "to", network: string): AccountIdentity | undefined;
export function useSwapAccounts(direction: "to"): AccountIdentity[];
export function useSwapAccounts(direction: SwapDirection, network: string): (AccountIdentity | AccountIdentityWithSupportedNetworks) | undefined;
export function useSwapAccounts(direction: SwapDirection): (AccountIdentity | AccountIdentityWithSupportedNetworks)[];
export function useSwapAccounts(direction: SwapDirection, network?: string) {
    const values = useContext<SwapAccountsContextType>(SwapAccountsStateContext as Context<SwapAccountsContextType>);

    if (values === undefined) {
        throw new Error('useSwapAccounts must be used within a SwapAccountsProvider');
    }

    const accounts = direction === "from" ? values.sourceAccounts : values.destinationAccounts;

    if (network) {
        if (direction === 'from') {
            // First, try to find the explicitly selected wallet if it supports this network
            if (values.selectedSourceWalletId) {
                const selectedWallet = values.sourceAccounts.find(acc =>
                    acc.id === values.selectedSourceWalletId &&
                    acc.walletWithdrawalSupportedNetworks?.includes(network)
                );
                if (selectedWallet) return selectedWallet;
            }
            // Fallback to any wallet that supports the network
            return values.sourceAccounts.find(acc => acc.walletWithdrawalSupportedNetworks?.includes(network));
        }

        return accounts.find(acc => {
            if ('walletAutofillSupportedNetworks' in acc) {
                return acc.walletAutofillSupportedNetworks?.includes(network)
            }
            return acc.provider?.autofillSupportedNetworks?.includes(network)
        });
    }

    return accounts;
}

export function useSelectedAccount(direction: "from", networkName: string | undefined): AccountIdentityWithSupportedNetworks | undefined;
export function useSelectedAccount(direction: "to", networkName: string | undefined): AccountIdentity | undefined;
export function useSelectedAccount(direction: SwapDirection, networkName: string | undefined): AccountIdentity | AccountIdentityWithSupportedNetworks | undefined;
export function useSelectedAccount(direction: SwapDirection, networkName: string | undefined) {
    const values = useContext<SwapAccountsContextType>(SwapAccountsStateContext as Context<SwapAccountsContextType>);
    if (!networkName) return undefined;
    if (values === undefined) {
        throw new Error('useSwapAccounts must be used within a SwapAccountsProvider');
    }

    if (direction === "from") {
        // First, try to find the explicitly selected wallet if it supports this network
        if (values.selectedSourceWalletId) {
            const selectedWallet = values.sourceAccounts.find(acc =>
                acc.id === values.selectedSourceWalletId &&
                acc.walletWithdrawalSupportedNetworks?.some(n => n === networkName)
            );
            if (selectedWallet) return selectedWallet;
        }
        // Fallback to any wallet that supports the network
        return values.sourceAccounts.find(acc => acc.walletWithdrawalSupportedNetworks?.some(n => n === networkName));
    }

    return values.destinationAccounts.find(acc => {
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

export function useNetworkBalance(direction: SwapDirection, networkName: string | undefined) {
    const balanceKey = useNetworkBalanceKey(direction, networkName);
    const balance = useBalanceStore((s) => (s.balances[balanceKey || "unknown"]));
    return balance;
}

export function useSelectSwapAccount(direction: SwapDirection) {
    const values = useContext<SwapAccountsUpdateContextType>(SwapAccountsUpdateContext as Context<SwapAccountsUpdateContextType>);

    if (values === undefined) {
        throw new Error('useSelectSwapAccount must be used within a SwapAccountsUpdateContext');
    }
    return direction === "from" ? values.selectSourceAccount : values.selectDestinationAccount;
}

function hasWallet(
    p: WalletProvider
): p is WalletProvider & { activeWallet: { address: string; id: string } } {
    return Boolean(p.activeWallet);
}

function ResolveWalletSwapAccount(provider: WalletProvider, wallet: Wallet, address: string): AccountIdentityWithSupportedNetworks {
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

function ResolveManualSwapAccount(provider: WalletProvider, address: string): AccountIdentity {
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