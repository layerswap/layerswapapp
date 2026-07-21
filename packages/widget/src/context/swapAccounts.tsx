import { Context, createContext, useCallback, useContext, useMemo, useState } from 'react'
import useWallet from '@/hooks/useWallet';
import { Address } from '@/lib/address/Address';
import { getKey, useBalanceStore } from '@/stores/balanceStore';
import { useManualDestAddressesStore } from '@/stores/manualDestAddressesStore';
import { Wallet, WalletConnectionProvider } from "@layerswap/wallet-core/types"
import { SwapDirection } from '@/exports';
import { addressIconDataUrl } from '@/lib/addressIconDataUrl';

export type { ManualDestAddress } from '@/stores/manualDestAddressesStore';

const SwapAccountsStateContext = createContext<SwapAccountsContextType | null>(null);
const SwapAccountsUpdateContext = createContext<SwapAccountsUpdateContextType | null>(null);

type PickerAccountsProviderProps = {
    children: React.ReactNode;
}

type SwapAccountsContextType = {
    sourceAccounts: AccountIdentityWithSupportedNetworks[];
    destinationAccounts: (AccountIdentity | AccountIdentityWithSupportedNetworks)[];
    /** The source account most recently chosen via selectSourceAccount, kept so
     * flows that work with a single wallet (e.g. the deposit wallet transfer)
     * can scope to the latest pick rather than every connected provider. */
    lastSelectedSource: BaseAccountIdentity | undefined;
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
    provider: WalletConnectionProvider;
    icon?: string;
}


export type AccountIdentityWithSupportedNetworks = AccountIdentity & {
    walletWithdrawalSupportedNetworks: Wallet['withdrawalSupportedNetworks'];
    walletAutofillSupportedNetworks: Wallet['autofillSupportedNetworks'];
    walletAsSourceSupportedNetworks: Wallet['asSourceSupportedNetworks'];
}
export function SwapAccountsProvider({ children }: PickerAccountsProviderProps) {

    const [selectedDestAccounts, setSelectedDestinationAccounts] = useState<BaseAccountIdentity[]>([])
    const [selectedSourceAccounts, setSelectedSourceAccounts] = useState<BaseAccountIdentity[]>([])
    const [lastSelectedSource, setLastSelectedSource] = useState<BaseAccountIdentity | undefined>(undefined)
    const { providers } = useWallet()
    const addManualDestAddress = useManualDestAddressesStore(s => s.addManualDestAddress)
    const manualDestAddresses = useManualDestAddressesStore(s => s.manualDestAddresses)

    const sourceAccounts: AccountIdentityWithSupportedNetworks[] = useMemo(() => {
        return providers.map(provider => {
            if (!hasWallet(provider)) return null;

            const selectedWallet = provider.connectedWallets?.find(wallet => wallet.id === selectedSourceAccounts.find(acc =>
                acc.providerName === provider.name && wallet.addresses.some(a => Address.equals(a, acc.address, null, provider.name)))?.id && wallet.addresses)

            const wallet = selectedWallet || provider.activeWallet;
            const selectedAccountAddress = selectedWallet ? selectedSourceAccounts.find(acc => acc.providerName === provider.name && acc.id === selectedWallet.id)?.address : undefined
            const address = selectedAccountAddress ? selectedAccountAddress : wallet.address;

            const res = ResolveWalletSwapAccount(provider, wallet, address);

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

            const manualStillExists = manuallyAdded && manualDestAddresses.some(
                m => m.providerName === provider.name && Address.equals(m.address, manuallyAdded.address, null, provider.name)
            );

            if (manuallyAdded && manualStillExists) {
                return ResolveManualSwapAccount(provider, manuallyAdded.address);
            }

            if (!hasWallet(provider)) return null;

            const selectedWallet = provider.connectedWallets?.find(wallet => wallet.id === selectedDestAccounts.find(acc =>
                acc.providerName === provider.name && wallet.addresses.some(a => Address.equals(a, acc.address, null, provider.name)))?.id && wallet.addresses)

            const wallet = selectedWallet || provider.activeWallet;
            const selectedAccountAddress = selectedWallet ? selectedDestAccounts.find(acc => acc.providerName === provider.name && acc.id === selectedWallet.id)?.address : undefined
            const address = selectedAccountAddress ? selectedAccountAddress : wallet.address;

            return ResolveWalletSwapAccount(provider, wallet, address);
        }).filter(Boolean) as AccountIdentity[];
    }, [providers, selectedDestAccounts, manualDestAddresses]);

    const selectDestinationAccount = useCallback((account: BaseAccountIdentity) => {
        if (account.id === 'manually_added' && account.address && account.providerName) {
            addManualDestAddress({ address: account.address, providerName: account.providerName });
        }
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
        setLastSelectedSource(account);
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

    const stateValues: SwapAccountsContextType = useMemo(() => ({
        sourceAccounts,
        destinationAccounts,
        lastSelectedSource,
    }), [sourceAccounts, destinationAccounts, lastSelectedSource]);

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
export function useSwapAccounts(direction: "from"): AccountIdentityWithSupportedNetworks[];
export function useSwapAccounts(direction: "to"): AccountIdentity[];
export function useSwapAccounts(direction: SwapDirection): (AccountIdentity | AccountIdentityWithSupportedNetworks)[];
export function useSwapAccounts(direction: SwapDirection) {
    const values = useContext<SwapAccountsContextType>(SwapAccountsStateContext as Context<SwapAccountsContextType>);

    if (values === undefined) {
        throw new Error('useSwapAccounts must be used within a SwapAccountsProvider');
    }
    return direction === "from" ? values.sourceAccounts : values.destinationAccounts;
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
    return direction === "from" ? values.sourceAccounts.find(acc => acc.provider.withdrawalSupportedNetworks?.some(n => n === networkName))
        :
        values.destinationAccounts.find(acc => {
            if ('walletAutofillSupportedNetworks' in acc) {
                return acc.walletAutofillSupportedNetworks?.some(n => n === networkName)
            }
            return acc.provider?.autofillSupportedNetworks?.some(n => n === networkName)
        });
}

/**
 * The full source account most recently chosen via selectSourceAccount,
 * resolved against the live source accounts (so it carries the wallet's
 * supported-network info). Returns undefined before any source pick. Used by
 * single-wallet flows that need to scope to the latest connected wallet rather
 * than every connected provider.
 */
export function useLatestSourceAccount(): AccountIdentityWithSupportedNetworks | undefined {
    const values = useContext<SwapAccountsContextType>(SwapAccountsStateContext as Context<SwapAccountsContextType>);
    if (values === undefined) {
        throw new Error('useLatestSourceAccount must be used within a SwapAccountsProvider');
    }
    const { lastSelectedSource, sourceAccounts } = values;
    if (!lastSelectedSource) return undefined;
    return sourceAccounts.find(acc =>
        acc.providerName === lastSelectedSource.providerName && acc.id === lastSelectedSource.id,
    );
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

export function useManualDestAddresses() {
    return useManualDestAddressesStore(s => s.manualDestAddresses);
}

export function useSelectSwapAccount(direction: SwapDirection) {
    const values = useContext<SwapAccountsUpdateContextType>(SwapAccountsUpdateContext as Context<SwapAccountsUpdateContextType>);

    if (values === undefined) {
        throw new Error('useSelectSwapAccount must be used within a SwapAccountsUpdateContext');
    }
    return direction === "from" ? values.selectSourceAccount : values.selectDestinationAccount;
}

function hasWallet(
    p: WalletConnectionProvider
): p is WalletConnectionProvider & { activeWallet: { address: string; id: string } } {
    return Boolean(p.activeWallet);
}

function ResolveWalletSwapAccount(provider: WalletConnectionProvider, wallet: Wallet, address: string): AccountIdentityWithSupportedNetworks {
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
        icon: wallet.icon,
    }
}

function ResolveManualSwapAccount(provider: WalletConnectionProvider, address: string): AccountIdentity {
    return {
        address,
        provider,
        providerName: provider.name,
        id: 'manually_added',
        displayName: "Manual",
        addresses: [address],
        icon: addressIconDataUrl(address, 20),
    };
}