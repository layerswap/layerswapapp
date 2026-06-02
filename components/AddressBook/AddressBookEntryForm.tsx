import { FC, useState } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
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

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }

    return (
        <form onSubmit={submit} onKeyDown={onKeyDown} className="flex items-start gap-2 min-w-0 w-full">
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                <div className="relative w-full">
                    <input
                        type="text"
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Name this address"
                        autoComplete="off"
                        className="w-full h-9 pl-3 pr-14 rounded-lg text-sm bg-secondary-300 border border-transparent text-primary-text placeholder:text-secondary-text focus:border-primary focus:ring-0 focus:outline-hidden"
                    />
                    {trimmedName.length > COUNTER_SHOW_AT && (
                        <span className={clsx('absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums', trimmedName.length > NAME_MAX ? 'text-error-foreground' : 'text-secondary-text')}>
                            {trimmedName.length} / {NAME_MAX}
                        </span>
                    )}
                </div>
                <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value.replace(/\s+/g, ''))}
                    placeholder="0x…"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full h-9 px-3 rounded-lg text-sm bg-secondary-300 border border-transparent text-primary-text placeholder:text-secondary-text focus:border-primary focus:ring-0 focus:outline-hidden truncate"
                />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="h-9 px-3 rounded-lg text-sm font-medium bg-primary text-primary-buttonTextColor hover:brightness-110 disabled:bg-secondary-300 disabled:text-secondary-text disabled:cursor-not-allowed transition"
                >
                    Save
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cancel"
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-secondary-text hover:text-primary-text hover:bg-secondary-400 transition"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </form>
    )
}

export default AddressBookEntryForm
