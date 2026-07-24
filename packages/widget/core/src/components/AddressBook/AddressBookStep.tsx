import { FC, useEffect, useMemo, useState } from 'react'
import { useAddressBookStore, SavedAddress } from '@/stores/addressBookStore'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import shortenString from '@/components/utils/ShortenString'
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon'
import AddressBookEntryForm, { AddressBookEntryFormProps } from './AddressBookEntryForm'
import NetworkLogoStack from './NetworkLogoStack'
import { useAddressScope } from './useAddressScope'
import { SearchComponent } from '@/components/Input/Search'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { useFormWizardaUpdate } from '@/context/formWizardProvider'
import AddressIcon from '../Common/AddressIcon'
import { HistoryItemSceleton } from '../Pages/SwapHistory/Snippet'

type EditingState =
    | { kind: 'closed' }
    | { kind: 'create', initial?: AddressBookEntryFormProps['initial'] }
    | { kind: 'edit', entry: SavedAddress }

const AddressRow: FC<{ entry: SavedAddress, onEdit: () => void, onDelete: () => void }> = ({ entry, onEdit, onDelete }) => {
    const raw = entry.address
    const { items, summary } = useAddressScope(raw, entry.networkTypes, entry.networks)
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary-500">
            <AddressIcon address={raw} size={36} className="rounded-lg shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm font-medium text-primary-text truncate">{entry.name}</p>
                <div className="flex items-center text-xs text-secondary-text min-w-0">
                    <ExtendedAddress address={raw} providerName={entry.networkTypes?.[0]} shouldShowChevron={false}>
                        <span className="truncate cursor-pointer hover:text-primary-text hover:underline transition">
                            {shortenString(raw)}
                        </span>
                    </ExtendedAddress>
                </div>
            </div>
            <NetworkLogoStack items={items} summary={summary} />
            <Popover>
                <PopoverTrigger asChild>
                    <button type="button" aria-label="More actions" className="p-2 rounded-md hover:bg-secondary-400 text-secondary-text hover:text-primary-text transition">
                        <MoreVertical className="h-4 w-4" />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={4} className="min-w-40 p-1 bg-secondary-500! rounded-xl">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-primary-text hover:bg-secondary-400 transition"
                    >
                        <Pencil className="h-4 w-4" />
                        <span>Edit</span>
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-error-foreground hover:bg-secondary-400 transition"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                    </button>
                </PopoverContent>
            </Popover>
        </div>
    )
}

const AddressBookStep: FC<{ onBack?: () => void }> = ({ onBack }) => {
    const savedAddresses = useAddressBookStore(s => s.savedAddresses)
    const removeAddress = useAddressBookStore(s => s.removeAddress)
    const { setGoBack } = useFormWizardaUpdate()

    const [editing, setEditing] = useState<EditingState>({ kind: 'closed' })
    const [query, setQuery] = useState('')

    const closeForm = () => setEditing({ kind: 'closed' })

    // While the form view is open, the modal's back arrow returns to the list
    // instead of jumping back to the menu. Restored when the form closes.
    useEffect(() => {
        if (editing.kind === 'closed') {
            if (onBack) setGoBack(onBack)
        } else {
            setGoBack(() => closeForm())
        }
    }, [editing.kind])

    const filteredAddresses = useMemo(() => {
        const lower = query.trim().toLowerCase()
        if (!lower) return savedAddresses
        // Substring search over name + raw address, not a normalized address match.
        return savedAddresses.filter(e =>
            e.name.toLowerCase().includes(lower) ||
            e.address.toLowerCase().includes(lower)
        )
    }, [savedAddresses, query])

    // Form sub-view — replaces the list so add/edit gets a single, focused placement.
    if (editing.kind !== 'closed') {
        const isEdit = editing.kind === 'edit'
        const initial = editing.kind === 'edit'
            ? { name: editing.entry.name, address: editing.entry.address, originalAddress: editing.entry.address, networkTypes: editing.entry.networkTypes, networks: editing.entry.networks }
            : editing.initial
        return (
            <div className="flex flex-col h-full text-primary-text">
                <h2 className="text-lg font-semibold mb-3">{isEdit ? 'Edit address' : 'Add address'}</h2>
                <AddressBookEntryForm initial={initial} onClose={closeForm} />
            </div>
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
        <div className="flex flex-col text-primary-text">
            <SearchComponent
                searchQuery={query}
                setSearchQuery={setQuery}
                placeholder="Search by name or address"
                containerClassName="mb-2"
            />
            <div className="flex flex-col gap-2">
                {filteredAddresses.length === 0 && (
                    <div className="flex items-baseline gap-1 px-1 py-3 text-sm text-secondary-text min-w-0">
                        <span className="shrink-0">No addresses match</span>
                        <span className="truncate min-w-0">&quot;{query}&quot;</span>
                    </div>
                )}
                {filteredAddresses.map(entry => (
                    <AddressRow
                        key={entry.address}
                        entry={entry}
                        onEdit={() => setEditing({ kind: 'edit', entry })}
                        onDelete={() => removeAddress(entry.address)}
                    />
                ))}
            </div>
            <button
                type="button"
                onClick={() => setEditing({ kind: 'create' })}
                className="mt-2 flex items-center justify-center gap-2 w-full h-12 rounded-xl text-base font-medium bg-secondary-500 hover:bg-secondary-400 text-primary-text transition"
            >
                <Plus className="h-5 w-5" />
                <span>Add address</span>
            </button>
        </div>
    )
}

export default AddressBookStep
