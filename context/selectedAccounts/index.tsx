import { Context, createContext, useContext, useEffect } from 'react'
import useSelectedWalletStore from './pickerSelectedWallets';
import useWallet from '@/hooks/useWallet';
import { Network } from '@/Models/Network';

const SelectedAccountsStateContext = createContext<SelectedAccountsContextType | null>(null);

type SelectedAccountsProviderProps = {
    children: React.ReactNode;
    from: Network | undefined
    to: Network | undefined
}

type SelectedAccountsContextType = {
    setSelectedSourceAccount: ReturnType<typeof useSelectedWalletStore>['addSelectedWallet'];
    selectedSourceAccount: ReturnType<typeof useSelectedWalletStore>['pickerSelectedWallet'];
}

export function SelectedAccountsProvider({ children, from, to }: SelectedAccountsProviderProps) {

    const { providers, getProvider } = useWallet()
    const { pickerSelectedWallet: selectedSourceAccount, pickerSelectedWallets: pickerSelectedSrcWallets, setSelectedSrcWallet: setSelectedSourceWallet, addSelectedWallet: addSelectedSrcWallet } = useSelectedWalletStore('from');
    const { pickerSelectedWallets: pickerSelectedDestWallets, addSelectedWallet: addSelectedDestWallet } = useSelectedWalletStore('to');

    const setSelectedSourceAccount: ReturnType<typeof useSelectedWalletStore>['addSelectedWallet'] = (props) => {
        if (!props) {
            addSelectedSrcWallet({ providerName: selectedSourceAccount?.wallet?.providerName, address: undefined, wallet: undefined })
            return
        }
        const { wallet, address, providerName } = props || {}
        const provider = providers?.find(p => p.name === wallet?.providerName)
        if (provider?.activeWallet?.address.toLowerCase() !== address?.toLowerCase() && wallet && address) {
            provider?.switchAccount && provider?.switchAccount(wallet, address)
        }
        const account = { wallet, address, providerName }
        addSelectedSrcWallet(account)
        setSelectedSourceWallet(address ? account : undefined);
    }

    useEffect(() => {
        if (from) {
            const provider = getProvider(from, 'withdrawal');
            const selectedSourceAccount = pickerSelectedSrcWallets?.find(w => w.providerName === provider?.name);

            if (selectedSourceAccount?.address) {
                return setSelectedSourceWallet(selectedSourceAccount)
            }
            else if (provider && provider.activeWallet) {
                const sourceAccount = {
                    wallet: provider.activeWallet,
                    address: provider.activeWallet.address,
                    providerName: provider.name
                }
                setSelectedSourceAccount(sourceAccount)
                setSelectedSourceWallet(sourceAccount)
                return
            }
        }
    }, [from, pickerSelectedSrcWallets])

    useEffect(() => {
        providers.forEach(provider => {
            const selectedWallet = pickerSelectedDestWallets?.find(w => w.providerName === provider.name)
            if (!selectedWallet && provider.activeWallet) {
                addSelectedDestWallet({ wallet: provider.activeWallet, address: provider.activeWallet?.address, providerName: provider.name })
            } else if (selectedWallet?.address && selectedWallet.providerName === provider.name && !provider.activeWallet) {
                addSelectedDestWallet({ wallet: undefined, address: undefined, providerName: provider.name })
            }
        })
    }, [pickerSelectedDestWallets, providers])

    useEffect(() => {
        providers.forEach(provider => {
            const selectedWallet = pickerSelectedSrcWallets?.find(w => w.providerName === provider.name)

            if (!selectedWallet && provider.activeWallet) {
                addSelectedSrcWallet({ wallet: provider.activeWallet, address: provider.activeWallet?.address, providerName: provider.name })
            } else if (selectedWallet?.address && selectedWallet.providerName === provider.name) {
                const selectedWalletOnProvider = provider.connectedWallets?.find(w => w.address === selectedWallet.address);
                if (!provider.activeWallet) {
                    addSelectedSrcWallet({ wallet: undefined, address: undefined, providerName: provider.name })
                    if (selectedWallet.providerName === selectedSourceAccount?.providerName) {
                        setSelectedSourceWallet(undefined)
                    }
                } else if (provider.activeWallet && !selectedWalletOnProvider) {
                    addSelectedSrcWallet({ wallet: provider.activeWallet, address: provider.activeWallet?.address, providerName: provider.name })
                    if (selectedWallet.providerName === selectedSourceAccount?.providerName) {
                        setSelectedSourceWallet({ wallet: provider.activeWallet, address: provider.activeWallet?.address, providerName: provider.name })
                    }
                }
            }
        })
    }, [pickerSelectedSrcWallets, providers])

    return (
        <SelectedAccountsStateContext.Provider value={{
            setSelectedSourceAccount,
            selectedSourceAccount
        }}>
            {children}
        </SelectedAccountsStateContext.Provider>
    )
}

export function useSelectAccounts() {
    const values = useContext<SelectedAccountsContextType>(SelectedAccountsStateContext as Context<SelectedAccountsContextType>);

    if (values === undefined) {
        throw new Error('useSelectAccounts must be used within a SelectedAccountsProvider');
    }

    return values;
}