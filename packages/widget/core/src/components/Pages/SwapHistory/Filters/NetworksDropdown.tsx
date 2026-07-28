import { FC, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import CheckboxRow from './CheckboxRow'
import { filterChipClasses } from './chipStyles'
import { FilterNetworkOption } from './types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn'
import { SearchComponent } from '@/components/Input/Search'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'

type NetworksDropdownProps = {
    networks: FilterNetworkOption[]
    selectedNames: string[]
    toggle: (name: string) => void
    count: number
}

const NetworksDropdown: FC<NetworksDropdownProps> = ({ networks, selectedNames, toggle, count }) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [orderedSnapshot, setOrderedSnapshot] = useState<FilterNetworkOption[]>(networks)
    const disabled = networks.length === 0

    const q = query.trim().toLowerCase()
    const filtered = q
        ? orderedSnapshot.filter(n =>
            n.display_name.toLowerCase().includes(q) || n.name.toLowerCase().includes(q)
        )
        : orderedSnapshot
    const label = count > 0 ? `Networks (${count})` : 'Networks'

    return (
        <Popover
            open={open}
            onOpenChange={(v) => {
                if (v) {
                    const selectedSet = new Set(selectedNames)
                    const selected = networks.filter(n => selectedSet.has(n.name))
                    const unselected = networks.filter(n => !selectedSet.has(n.name))
                    setOrderedSnapshot([...selected, ...unselected])
                } else {
                    setQuery('')
                }
                setOpen(v)
            }}
        >
            <PopoverTrigger asChild>
                <button type="button" disabled={disabled} className={filterChipClasses(count > 0)}>
                    <span>{label}</span>
                    <ChevronDown className="w-4 h-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 w-64 overflow-hidden">
                <div className="p-2 pb-1 border-b border-secondary-500">
                    <SearchComponent
                        searchQuery={query}
                        setSearchQuery={setQuery}
                        placeholder="Search networks"
                        containerClassName="mb-0 h-9"
                    />
                </div>
                <div className="max-h-60 overflow-y-auto styled-scroll p-1">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-secondary-text">
                            <span>No networks found</span>
                        </div>
                    ) : (
                        filtered.map(n => (
                            <CheckboxRow
                                key={n.name}
                                checked={selectedNames.includes(n.name)}
                                onToggle={() => toggle(n.name)}
                                icon={n.logo ? (
                                    <ImageWithFallback
                                        src={n.logo}
                                        alt={n.display_name}
                                        width={20}
                                        height={20}
                                        className="rounded-md"
                                    />
                                ) : null}
                                label={n.display_name}
                            />
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default NetworksDropdown
