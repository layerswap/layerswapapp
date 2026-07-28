import { FC, ReactNode, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useAddressBookStore, NAME_MAX, COUNTER_SHOW_AT, SavedAddress } from '@/stores/addressBookStore'
import { Address } from '@/lib/address/Address'
import AddressBadge from './AddressBadge'
import NetworkScopeSelector from './NetworkScopeSelector'
import { useNetworkScope } from './useNetworkScope'

export type AddressBookEntryFormProps = {
    initial?: Partial<SavedAddress> & { originalAddress?: string }
    availableNetworks?: string[]
    onClose: () => void
}

const AddressBookEntryForm: FC<AddressBookEntryFormProps> = ({ initial, availableNetworks, onClose }) => {
    const addAddress = useAddressBookStore(s => s.addAddress)
    const editAddress = useAddressBookStore(s => s.editAddress)
    const savedAddresses = useAddressBookStore(s => s.savedAddresses)

    const [name, setName] = useState(initial?.name ?? '')
    const [address, setAddress] = useState(initial?.address ?? '')
    const scope = useNetworkScope(address, initial, availableNetworks)

    const trimmedName = name.trim()
    const provider = scope.provider

    const isDuplicate = useMemo(() => {
        const trimmed = address.trim()
        if (!trimmed) return false
        return savedAddresses.some(e =>
            !(initial?.originalAddress && Address.equals(e.address, initial.originalAddress, null, e.networkTypes?.[0])) &&
            Address.equals(e.address, trimmed, null, provider)
        )
    }, [savedAddresses, address, provider, initial?.originalAddress])

    const canSubmit = !!trimmedName && !!address.trim() && !(trimmedName.length > NAME_MAX) && !isDuplicate && (!scope.selector || scope.selector.selected.length > 0)

    const submit = () => {
        if (!canSubmit) return
        const entry = { name: trimmedName, address: address.trim(), ...scope.entry }
        if (initial?.originalAddress) {
            editAddress(initial.originalAddress, entry)
        } else {
            addAddress(entry)
        }
        onClose()
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col gap-2">
                <Field
                    label="Name"
                    hint={trimmedName.length > COUNTER_SHOW_AT && (
                        <span className={clsx('text-xs tabular-nums', trimmedName.length > NAME_MAX ? 'text-error-foreground' : 'text-secondary-text')}>
                            {trimmedName.length} / {NAME_MAX}
                        </span>
                    )}
                >
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
                        placeholder="My Layerswap wallet…"
                        autoComplete="off"
                        className="w-full h-10 bg-transparent border-0 outline-none text-primary-text placeholder:text-secondary-text text-lg font-normal leading-7 focus:ring-0 p-0"
                    />
                </Field>
                <Field label="Address" hint={<AddressBadge entry={{ address, networkTypes: scope.entry.networkTypes }} duplicate={isDuplicate} />}>
                    <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value.replace(/\s+/g, ''))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
                        placeholder="0x…"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full h-10 bg-transparent border-0 outline-none text-primary-text placeholder:text-secondary-text text-lg leading-7 focus:ring-0 p-0"
                    />
                </Field>
                {scope.selector && !isDuplicate && <NetworkScopeSelector {...scope.selector} />}
            </div>
            <div className="mt-2 flex gap-2">
                <button type="button" onClick={submit} disabled={!canSubmit} className="flex-1 h-12 rounded-xl text-base font-medium bg-primary text-primary-buttonTextColor hover:brightness-110 disabled:bg-secondary-300 disabled:text-secondary-text disabled:cursor-not-allowed transition">
                    Save
                </button>
                <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl text-base font-medium bg-secondary-500 hover:bg-secondary-400 text-primary-text transition">
                    Cancel
                </button>
            </div>
        </div>
    )
}

const Field: FC<{ label: string, hint?: ReactNode, children: ReactNode }> = ({ label, hint, children }) => (
    <label className="block bg-secondary-500 rounded-2xl px-4 py-2.5 border border-transparent focus-within:border-primary-500 transition-colors">
        <div className="flex items-center justify-between mb-0.5">
            <span className="text-secondary-text text-base">{label}</span>
            {hint}
        </div>
        {children}
    </label>
)

export default AddressBookEntryForm
