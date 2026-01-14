import { Context, FC, createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { useAccount } from 'wagmi';

type ActiveAccountState = {
    activeConnection?: {
        id: string | undefined
        address: string | undefined
    }
    setActiveAddress: (address: string) => void
}

export const ActiveEvmAccountContext = createContext<ActiveAccountState | undefined>(undefined);

type Props = {
    children?: JSX.Element | JSX.Element[];
}

export const ActiveEvmAccountProvider: FC<Props> = ({ children }) => {
    const activeAccount = useAccount()
    const [selectedAddress, setSelectedAddress] = useState<string>()

    const activeConnection = useMemo(() => {
        const isSelectedAddressActive = activeAccount.addresses && activeAccount.addresses.some(addr => addr === selectedAddress);
        return {
            id: activeAccount.connector?.id,
            address: isSelectedAddressActive ? selectedAddress : activeAccount.address,
            chainId: activeAccount.chainId
        }
    }, [activeAccount, selectedAddress, activeAccount.chainId])

    const setActiveAddress = useCallback((address: string) => {
        setSelectedAddress(address)
    }, [])

    return (
        <ActiveEvmAccountContext.Provider value={{ activeConnection, setActiveAddress }}>
            {children}
        </ActiveEvmAccountContext.Provider>
    )
}

export function useActiveEvmAccount() {
    const data = useContext(ActiveEvmAccountContext as Context<ActiveAccountState>)
    if (!data) {
        throw new Error('useActiveEvmAccount must be used within a ActiveEvmAccountProvider')
    }
    return data
}