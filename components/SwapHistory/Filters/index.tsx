import { FC } from 'react'
import { SearchComponent } from '../../Input/Search'
import { Wallet } from '@/Models/WalletProvider'
import WalletsDropdown from './WalletsDropdown'
import NetworksDropdown from './NetworksDropdown'
import ClearAllButton from './ClearAllButton'
import { FilterNetworkOption } from './types'

type FiltersProps = {
    searchQuery: string
    setSearchQuery: (v: string) => void
    walletAddresses: string[]
    toggleWalletAddress: (address: string) => void
    networkNames: string[]
    toggleNetworkName: (name: string) => void
    wallets: Wallet[]
    networks: FilterNetworkOption[]
    onClearAll: () => void
}

const Filters: FC<FiltersProps> = ({
    searchQuery,
    setSearchQuery,
    walletAddresses,
    toggleWalletAddress,
    networkNames,
    toggleNetworkName,
    wallets,
    networks,
    onClearAll,
}) => {
    const hasAny =
        walletAddresses.length > 0 ||
        networkNames.length > 0

    return (
        <div className="space-y-2 pb-3">
            <SearchComponent
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                placeholder="Search by transaction hash"
                containerClassName="mb-0"
            />
            <div className="flex flex-wrap items-center gap-2">
                <WalletsDropdown
                    wallets={wallets}
                    selectedAddresses={walletAddresses}
                    toggle={toggleWalletAddress}
                    count={walletAddresses.length}
                />
                <NetworksDropdown
                    networks={networks}
                    selectedNames={networkNames}
                    toggle={toggleNetworkName}
                    count={networkNames.length}
                />
                {hasAny ? <ClearAllButton onClick={onClearAll} /> : null}
            </div>
        </div>
    )
}

export default Filters
