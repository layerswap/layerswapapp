import { FC, ReactNode, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useAddressBookStore, NAME_MAX, COUNTER_SHOW_AT } from '@/stores/addressBookStore'
import { useSettingsState } from '@/context/settings'
import { Address as AddressClass } from '@/lib/address'

export type AddressBookEntryFormProps = {
    initial?: {
        name?: string
        address?: string
        editingOriginalAddress?: string
    }
    onClose: () => void
}

const AddressBookEntryForm: FC<AddressBookEntryFormProps> = ({ initial, onClose }) => {
    const { networks } = useSettingsState()
    const addAddress = useAddressBookStore(s => s.addAddress)
    const editAddress = useAddressBookStore(s => s.editAddress)

    const [name, setName] = useState(initial?.name ?? '')
    const [address, setAddress] = useState(initial?.address ?? '')

    const trimmedName = name.trim()
    const trimmedAddress = address.trim()
    const isAddressValid = useMemo(
        () => AddressClass.isValidForAnyNetwork(trimmedAddress, networks),
        [trimmedAddress, networks]
    )
    const canSubmit = !!trimmedName && !!trimmedAddress && !(trimmedName.length > NAME_MAX) && isAddressValid

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit) return
        const original = initial?.editingOriginalAddress
        if (original) {
            editAddress(original, { name: trimmedName, address: trimmedAddress })
        } else {
            addAddress({ name: trimmedName, address: trimmedAddress })
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
                        className="w-full h-14 bg-transparent border-0 outline-none text-primary-text placeholder:text-secondary-text text-[22px] font-normal leading-7 focus:ring-0 p-0"
                    />
                </Field>
                <Field
                    label="Address"
                    hint={trimmedAddress && !isAddressValid && (
                        <span className="text-xs text-error-foreground">Unrecognized address format</span>
                    )}
                >
                    <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value.replace(/\s+/g, ''))}
                        placeholder="0x…"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full h-14 bg-transparent border-0 outline-none text-primary-text placeholder:text-secondary-text text-[22px] leading-7 focus:ring-0 p-0"
                    />
                </Field>
            </div>
            <button type="submit" disabled={!canSubmit} className="mt-auto w-full h-12 rounded-xl text-base font-medium bg-primary text-primary-buttonTextColor hover:brightness-110 disabled:bg-secondary-300 disabled:text-secondary-text disabled:cursor-not-allowed transition">
                Save
            </button>
        </form>
    )
}

const Field: FC<{ label: string, hint?: ReactNode, children: ReactNode }> = ({ label, hint, children }) => (
    <label className="block bg-secondary-500 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
            <span className="text-secondary-text text-base">{label}</span>
            {hint}
        </div>
        {children}
    </label>
)

export default AddressBookEntryForm
