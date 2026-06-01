import { FC, useMemo, useState } from 'react'
import { useAddressBookStore, SavedAddress } from '@/stores/addressBookStore'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import AddressIcon from '@/components/AddressIcon'
import shortenString from '@/components/utils/ShortenString'
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon'
import AddressBookEntryForm, { AddressBookEntryFormProps } from './AddressBookEntryForm'
import { ErrorDisplay } from '@/components/validationError/ErrorDisplay'
import { AlertTriangle } from 'lucide-react'
import { HistoryItemSceleton } from '@/components/SwapHistory/Snippet'
import { SearchComponent } from '@/components/Input/Search'
import { filterChipClasses } from '@/components/SwapHistory/Filters/chipStyles'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'

type EditingState =
    | { kind: 'closed' }
    | { kind: 'create', initial?: AddressBookEntryFormProps['initial'] }
    | { kind: 'edit', entry: SavedAddress }

const AddressBookStep: FC = () => {
    const savedAddresses = useAddressBookStore(s => s.savedAddresses)
    const removeAddress = useAddressBookStore(s => s.removeAddress)
    const clearAll = useAddressBookStore(s => s.clearAll)

    const [editing, setEditing] = useState<EditingState>({ kind: 'closed' })
    const [query, setQuery] = useState('')
    const [pendingClearAll, setPendingClearAll] = useState(false)

    const closeForm = () => setEditing({ kind: 'closed' })

    const filteredAddresses = useMemo(() => {
        const lower = query.trim().toLowerCase()
        if (!lower) return savedAddresses
        // Substring search over name + raw address, not a normalized address match.
        return savedAddresses.filter(e =>
            e.name.toLowerCase().includes(lower) ||
            e.address.toLowerCase().includes(lower)
        )
    }, [savedAddresses, query])

    if (editing.kind === 'create') {
        return <AddressBookEntryForm initial={editing.initial} onClose={closeForm} />
    }
    if (editing.kind === 'edit') {
        return (
            <AddressBookEntryForm
                initial={{
                    name: editing.entry.name,
                    address: editing.entry.address,
                    editingOriginalAddress: editing.entry.address,
                    networkType: editing.entry.networkType,
                }}
                onClose={closeForm}
            />
        )
    }
    if (savedAddresses.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-full text-primary-text">
                <HistoryItemSceleton className="scale-[.63] w-full shadow-card mr-7" />
                <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
                <div className="mt-2 text-center space-y-2">
                    <h1 className="text-secondary-text text-[28px] font-bold tracking-wide">No saved addresses</h1>
                    <p className="max-w-xs text-center text-primary-text-tertiary text-base font-normal mx-auto">Label a wallet so its name shows up across the app.</p>
                </div>
                <button type="button" onClick={() => setEditing({ kind: 'create' })} className="mt-10 flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-400 py-2 px-3 rounded-lg">
                    <Plus className="w-4 h-4" />
                    <p>Add address</p>
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full text-primary-text">
            <div className="space-y-2 pb-3">
                <SearchComponent
                    searchQuery={query}
                    setSearchQuery={setQuery}
                    placeholder="Search by name or address"
                    containerClassName="mb-0"
                />
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setEditing({ kind: 'create' })} className={filterChipClasses(false)}>
                        <Plus className="h-4 w-4" />
                        <span>Add new</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPendingClearAll(true)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors shrink-0 whitespace-nowrap bg-error-background text-error-foreground hover:brightness-110"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Clear all</span>
                    </button>
                </div>
            </div>
            {pendingClearAll && (
                <div className="mb-3">
                    <ErrorDisplay
                        icon={<AlertTriangle className="h-5 w-5 text-warning-foreground" />}
                        title="Delete all saved addresses?"
                        message="This removes every saved name from your address book. It can't be undone."
                        footer={
                            <div className="flex gap-2 mt-3">
                                <button type="button" onClick={() => setPendingClearAll(false)} className="flex-1 h-10 rounded-md text-sm font-medium bg-secondary-500 hover:bg-secondary-300 text-primary-text transition">
                                    Cancel
                                </button>
                                <button type="button" onClick={() => { clearAll(); setPendingClearAll(false) }} className="flex-1 h-10 rounded-md text-sm font-medium bg-error-background text-error-foreground hover:brightness-110 transition">
                                    Delete all
                                </button>
                            </div>
                        }
                    />
                </div>
            )}
            <div className="flex flex-col gap-2">
                {filteredAddresses.length === 0 && (
                    <div className="flex items-baseline gap-1 px-1 py-3 text-sm text-secondary-text min-w-0">
                        <span className="shrink-0">No addresses match</span>
                        <span className="truncate min-w-0">&quot;{query}&quot;</span>
                    </div>
                )}
                {filteredAddresses.map(entry => {
                    const raw = entry.address
                    return (
                        <div key={raw} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary-500">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="rounded-md h-8 w-8 overflow-hidden">
                                    <AddressIcon className="h-8 w-8" address={raw} size={32} rounded="6px" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-primary-text truncate">{entry.name}</p>
                                    <ExtendedAddress address={raw} providerName={entry.networkType} shouldShowChevron={false} displayName="">
                                        <p className="text-xs text-secondary-text truncate cursor-pointer hover:text-primary-text hover:underline transition w-fit">
                                            {shortenString(raw)}
                                        </p>
                                    </ExtendedAddress>
                                </div>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button type="button" aria-label="More actions" className="p-2 rounded-md hover:bg-secondary-400 text-secondary-text hover:text-primary-text transition">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent align="end" sideOffset={4} className="min-w-[160px] p-1 bg-secondary-500! rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setEditing({ kind: 'edit', entry })}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-primary-text hover:bg-secondary-400 transition"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeAddress(raw)}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-error-foreground hover:bg-secondary-400 transition"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete</span>
                                    </button>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default AddressBookStep
