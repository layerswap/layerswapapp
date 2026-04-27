import { FC } from 'react'
import WalletsDropdown from './WalletsDropdown'
import NetworksDropdown from './NetworksDropdown'
import IncompleteToggle from './IncompleteToggle'
import ClearAllButton from './ClearAllButton'
import { FilterNetworkOption } from './types'
import { SearchComponent } from '@/components/Input/Search'
import { Wallet } from '@/types/wallet'

type FiltersProps = {
    searchQuery: string
    setSearchQuery: (v: string) => void
    walletAddresses: string[]
    toggleWalletAddress: (address: string) => void
    networkNames: string[]
    toggleNetworkName: (name: string) => void
    hideIncomplete: boolean
    setHideIncomplete: (v: boolean) => void
    wallets: Wallet[]
    networks: FilterNetworkOption[]
    hasPending: boolean
    hasIncomplete: boolean
    onClearAll: () => void
}

const Filters: FC<FiltersProps> = ({
    searchQuery,
    setSearchQuery,
    walletAddresses,
    toggleWalletAddress,
    networkNames,
    toggleNetworkName,
    hideIncomplete,
    setHideIncomplete,
    wallets,
    networks,
    hasPending,
    hasIncomplete,
    onClearAll,
}) => {
    const hasAny =
        walletAddresses.length > 0 ||
        networkNames.length > 0 ||
        hideIncomplete

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
                {hasIncomplete ? (
                    <IncompleteToggle
                        hideIncomplete={hideIncomplete}
                        setHideIncomplete={setHideIncomplete}
                        showDot={hasPending && !hideIncomplete}
                    />
                ) : null}
                {hasAny ? <ClearAllButton onClick={onClearAll} /> : null}
            </div>
        </div>
    )
}

export default Filters
