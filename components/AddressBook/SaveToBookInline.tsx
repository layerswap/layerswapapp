import { FC, useState } from 'react'
import clsx from 'clsx'
import { BookmarkPlus } from 'lucide-react'
import FilledX from '@/components/icons/FilledX'
import SecondaryButton from '@/components/buttons/secondaryButton'
import { useAddressBookStore, NAME_MAX, COUNTER_SHOW_AT } from '@/stores/addressBookStore'

export const SaveToBookNameForm: FC<{ address: string, onDone: () => void, compact?: boolean }> = ({ address, onDone, compact }) => {
    const addAddress = useAddressBookStore(s => s.addAddress)
    const [name, setName] = useState('')

    const trimmed = name.trim()
    const len = trimmed.length
    const isValid = len > 0 && len <= NAME_MAX

    const confirm = () => {
        if (!isValid) return
        addAddress({ name: trimmed, address })
        onDone()
    }

    return (
        <div className={clsx('w-full', compact ? 'space-y-1.5' : 'mt-2 space-y-2')}>
            <div className="relative w-full">
                <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); confirm() }
                        if (e.key === 'Escape') onDone()
                    }}
                    placeholder="Name this address"
                    autoComplete="off"
                    className={clsx(
                        'pr-20 w-full rounded-lg border truncate hover:overflow-x-scroll focus:border-primary focus:ring-0 focus:outline-hidden',
                        compact
                            ? 'pl-3 h-9 text-sm bg-secondary-300 border-transparent placeholder:text-secondary-text'
                            : 'h-12 leading-4 font-semibold border-secondary-800 !bg-secondary-500 placeholder:text-primary-text-tertiary/80 placeholder:font-normal'
                    )}
                />
                <div className={clsx('absolute top-1/2 -translate-y-1/2 flex items-center gap-2', compact ? 'right-2' : 'right-3')}>
                    {len > COUNTER_SHOW_AT && (
                        <span className={clsx('text-xs tabular-nums', len > NAME_MAX ? 'text-error-foreground' : 'text-secondary-text')}>
                            {len} / {NAME_MAX}
                        </span>
                    )}
                    <button type="button" onClick={onDone} aria-label="Cancel" className="text-secondary-text hover:text-primary-text transition">
                        <FilledX className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
                    </button>
                </div>
            </div>
            <button
                type="button"
                onClick={confirm}
                disabled={!isValid}
                className={clsx(
                    'w-full rounded-lg bg-primary text-primary-buttonTextColor hover:brightness-110 disabled:text-secondary-text disabled:cursor-not-allowed transition',
                    compact
                        ? 'h-9 text-sm font-medium disabled:bg-secondary-300'
                        : 'h-12 text-base font-semibold disabled:bg-secondary-500'
                )}
            >
                Save
            </button>
        </div>
    )
}

const SaveToBookInline: FC<{ address: string }> = ({ address }) => {
    const [editing, setEditing] = useState(false)

    if (!editing) {
        return (
            <SecondaryButton onClick={() => setEditing(true)} size="lg" className="mt-2 w-full">
                <span className="flex items-center justify-center gap-2">
                    <BookmarkPlus className="h-4 w-4" />
                    <span>Save to address book</span>
                </span>
            </SecondaryButton>
        )
    }

    return <SaveToBookNameForm address={address} onDone={() => setEditing(false)} />
}

export default SaveToBookInline
