import { FC, useMemo, useState } from 'react'
import { useAddressBookStore } from '@/stores/addressBookStore'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import AddressIcon from '@/components/AddressIcon'
import shortenString from '@/components/utils/ShortenString'
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon'
import AddressBookEntryForm from './AddressBookEntryForm'
import { HistoryItemSceleton } from '@/components/SwapHistory/Snippet'
import { SearchComponent } from '@/components/Input/Search'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'

type Inline =
    | { kind: 'none' }
    | { kind: 'add' }
    | { kind: 'edit', address: string }

const AddressBookStep: FC = () => {
    const savedAddresses = useAddressBookStore(s => s.savedAddresses)
    const removeAddress = useAddressBookStore(s => s.removeAddress)

    const [inline, setInline] = useState<Inline>({ kind: 'none' })
    const [query, setQuery] = useState('')

    const closeForm = () => setInline({ kind: 'none' })

    const filteredAddresses = useMemo(() => {
        const lower = query.trim().toLowerCase()
        if (!lower) return savedAddresses
        // Substring search over name + raw address, not a normalized address match.
        return savedAddresses.filter(e =>
            e.name.toLowerCase().includes(lower) ||
            e.address.toLowerCase().includes(lower)
        )
    }, [savedAddresses, query])

    if (savedAddresses.length === 0 && inline.kind !== 'add') {
        return (
            <div className="flex flex-col justify-center items-center h-full text-primary-text">
                <HistoryItemSceleton className="scale-[.63] w-full shadow-card mr-7" />
                <HistoryItemSceleton className="scale-[.63] -mt-12 shadow-card ml-7 w-full" />
                <div className="mt-2 text-center space-y-2">
                    <h1 className="text-secondary-text text-[28px] font-bold tracking-wide">No saved addresses</h1>
                    <p className="max-w-xs text-center text-primary-text-tertiary text-base font-normal mx-auto">Label a wallet so its name shows up across the app.</p>
                </div>
                <button type="button" onClick={() => setInline({ kind: 'add' })} className="mt-10 flex items-center gap-2 text-base text-secondary-text font-normal bg-secondary-500 hover:bg-secondary-400 py-2 px-3 rounded-lg">
                    <Plus className="w-4 h-4" />
                    <p>Add address</p>
                </button>
            </div>
        )
    }

    return (
        <div className="flex flex-col text-primary-text">
            <SearchComponent
                searchQuery={query}
                setSearchQuery={setQuery}
                placeholder="Search by name or address"
                containerClassName="mb-2"
            />
            <div className="flex flex-col gap-2">
                {filteredAddresses.length === 0 && inline.kind !== 'add' && (
                    <div className="flex items-baseline gap-1 px-1 py-3 text-sm text-secondary-text min-w-0">
                        <span className="shrink-0">No addresses match</span>
                        <span className="truncate min-w-0">&quot;{query}&quot;</span>
                    </div>
                )}
                {filteredAddresses.map(entry => {
                    const raw = entry.address
                    const isEditing = inline.kind === 'edit' && inline.address === raw
                    return (
                        <div key={raw} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary-500">
                            {isEditing ? (
                                <AddressBookEntryForm
                                    initial={{
                                        name: entry.name,
                                        address: entry.address,
                                        editingOriginalAddress: entry.address,
                                        networkType: entry.networkType,
                                    }}
                                    onClose={closeForm}
                                />
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="rounded-md h-8 w-8 overflow-hidden">
                                            <AddressIcon className="h-8 w-8" address={raw} size={32} rounded="6px" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-primary-text truncate">{entry.name}</p>
                                            <ExtendedAddress address={raw} providerName={entry.networkType} shouldShowChevron={false}>
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
                                                onClick={() => setInline({ kind: 'edit', address: raw })}
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
                                </>
                            )}
                        </div>
                    )
                })}
                {inline.kind === 'add' && (
                    <div className="p-3 rounded-xl bg-secondary-500">
                        <AddressBookEntryForm onClose={closeForm} />
                    </div>
                )}
            </div>
            {inline.kind !== 'add' && (
                <button
                    type="button"
                    onClick={() => setInline({ kind: 'add' })}
                    className="mt-2 flex items-center justify-center gap-2 w-full h-12 rounded-xl text-base font-medium bg-secondary-500 hover:bg-secondary-400 text-primary-text transition"
                >
                    <Plus className="h-5 w-5" />
                    <span>Add address</span>
                </button>
            )}
        </div>
    )
}

export default AddressBookStep
