import { FC } from 'react'
import clsx from 'clsx'
import { NetworkType } from '@/Models/Network'
import { classifyAddress, addressTypeLabel } from '@layerswap/utils'

type BadgeEntry = { address?: string, networkTypes?: NetworkType[] }

const scopeLabel = ({ address, networkTypes }: BadgeEntry): string | null => {
    const trimmed = (address ?? '').trim()
    if (!trimmed) return null
    const types = networkTypes?.length ? networkTypes : classifyAddress(trimmed).types
    if (!types.length) return 'Unrecognized'
    return types.map(addressTypeLabel).join(' / ')
}

const AddressBadge: FC<{ entry?: BadgeEntry, duplicate?: boolean }> = ({ entry, duplicate }) => {
    const text = duplicate ? 'Already saved' : (entry ? scopeLabel(entry) : null)
    if (!text) return null
    return (
        <span className={clsx(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
            duplicate ? 'bg-error-foreground/10 text-error-foreground' : 'bg-secondary-300 text-secondary-text'
        )}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', duplicate ? 'bg-error-foreground' : 'bg-primary-text-tertiary')} />
            <span>{text}</span>
        </span>
    )
}

export default AddressBadge
