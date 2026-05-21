import { shallow } from 'zustand/shallow'
import { useEvmStore } from '../service/evmStore'

type ActiveConnection = {
    id: string | undefined
    address: string | undefined
}

type ActiveAccountState = {
    activeConnection: ActiveConnection
    setActiveAddress: (address: string) => void
}

const selectActiveConnection = (state: ReturnType<typeof useEvmStore.getState>): ActiveConnection => {
    const { wagmiAccount, selectedAddress } = state
    const isSelectedAddressActive = !!selectedAddress
        && !!wagmiAccount.addresses
        && wagmiAccount.addresses.some(addr => addr === selectedAddress)
    return {
        id: wagmiAccount.connectorId,
        address: isSelectedAddressActive ? selectedAddress : wagmiAccount.address,
    }
}

export function useActiveEvmAccount(): ActiveAccountState {
    const activeConnection = useEvmStore(selectActiveConnection, shallow)
    const setActiveAddress = useEvmStore(s => s.setActiveAddress)
    return { activeConnection, setActiveAddress }
}
