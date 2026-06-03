import { FC, ReactNode, useState } from 'react'
import clsx from 'clsx'
import { useAddressBookStore, NAME_MAX, COUNTER_SHOW_AT } from '@/stores/addressBookStore'
import { NetworkType } from '@/Models/Network'

export type AddressBookEntryFormProps = {
    initial?: {
        name?: string
        address?: string
        editingOriginalAddress?: string
        networkType?: NetworkType
    }
    onClose: () => void
}

const AddressBookEntryForm: FC<AddressBookEntryFormProps> = ({ initial, onClose }) => {
    const addAddress = useAddressBookStore(s => s.addAddress)
    const editAddress = useAddressBookStore(s => s.editAddress)

    const [name, setName] = useState(initial?.name ?? '')
    const [address, setAddress] = useState(initial?.address ?? '')

    const trimmedName = name.trim()
    const trimmedAddress = address.trim()
    const canSubmit = !!trimmedName && !!trimmedAddress && !(trimmedName.length > NAME_MAX)

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        const original = initial?.editingOriginalAddress
        if (original) {
            editAddress(original, { name: trimmedName, address: trimmedAddress, networkType: initial?.networkType })
        } else {
            addAddress({ name: trimmedName, address: trimmedAddress, networkType: initial?.networkType })
        }
        onClose()
    }

    return (
        <form onSubmit={submit} className="flex flex-col h-full">
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
                        placeholder="My Layerswap wallet…"
                        autoComplete="off"
                        className="w-full h-10 bg-transparent border-0 outline-none text-primary-text placeholder:text-secondary-text text-lg font-normal leading-7 focus:ring-0 p-0"
                    />
                </Field>
                <Field label="Address">
                    <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value.replace(/\s+/g, ''))}
                        placeholder="0x…"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full h-10 bg-transparent border-0 outline-none text-primary-text placeholder:text-secondary-text text-lg leading-7 focus:ring-0 p-0"
                    />
                </Field>
            </div>
            <div className="mt-2 flex gap-2">
                <button type="submit" disabled={!canSubmit} className="flex-1 h-12 rounded-xl text-base font-medium bg-primary text-primary-buttonTextColor hover:brightness-110 disabled:bg-secondary-300 disabled:text-secondary-text disabled:cursor-not-allowed transition">
                    Save
                </button>
                <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl text-base font-medium bg-secondary-500 hover:bg-secondary-400 text-primary-text transition">
                    Cancel
                </button>
            </div>
        </form>
    )
}

const Field: FC<{ label: string, hint?: ReactNode, children: ReactNode }> = ({ label, hint, children }) => (
    <label className="block bg-secondary-500 rounded-2xl px-4 py-2.5">
        <div className="flex items-center justify-between mb-0.5">
            <span className="text-secondary-text text-base">{label}</span>
            {hint}
        </div>
        {children}
    </label>
)

export default AddressBookEntryForm
