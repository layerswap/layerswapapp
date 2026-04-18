import { FC } from 'react'
import { SearchComponent } from '../../Input/Search'
import { Wallet } from '@/Models/WalletProvider'
import WalletsDropdown from './WalletsDropdown'
import NetworksDropdown from './NetworksDropdown'
import IncompleteToggle from './IncompleteToggle'
import ClearAllButton from './ClearAllButton'
import { FilterNetworkOption } from './types'

type FiltersProps = {
    searchQuery: string
    setSearchQuery: (v: string) => void
    walletInternalIds: string[]
    toggleWalletInternalId: (id: string) => void
    networkNames: string[]
    toggleNetworkName: (name: string) => void
    hideIncomplete: boolean
    setHideIncomplete: (v: boolean) => void
    wallets: Wallet[]
    networks: FilterNetworkOption[]
    hasPending: boolean
    onClearAll: () => void
}

const Filters: FC<FiltersProps> = ({
    searchQuery,
    setSearchQuery,
    walletInternalIds,
    toggleWalletInternalId,
    networkNames,
    toggleNetworkName,
    hideIncomplete,
    setHideIncomplete,
    wallets,
    networks,
    hasPending,
    onClearAll,
}) => {
    const hasAny =
        walletInternalIds.length > 0 ||
        networkNames.length > 0 ||
        hideIncomplete

    return (
        <div className="space-y-2">
            <SearchComponent
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                placeholder="Search by transaction hash"
                containerClassName="mb-0"
            />
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto styled-scroll">
                <WalletsDropdown
                    wallets={wallets}
                    selectedIds={walletInternalIds}
                    toggle={toggleWalletInternalId}
                    count={walletInternalIds.length}
                />
                <NetworksDropdown
                    networks={networks}
                    selectedNames={networkNames}
                    toggle={toggleNetworkName}
                    count={networkNames.length}
                />
                <IncompleteToggle
                    hideIncomplete={hideIncomplete}
                    setHideIncomplete={setHideIncomplete}
                    showDot={hasPending && !hideIncomplete}
                />
                {hasAny ? <ClearAllButton onClick={onClearAll} /> : null}
            </div>
        </div>
    )
}

export default Filters
export type { FilterNetworkOption, FilterOpts } from './types'
export { default as NoMatches } from './NoMatches'
export { default as SearchResult } from './SearchResult'
export { matchesFilters, isIncomplete } from './filterSwaps'
