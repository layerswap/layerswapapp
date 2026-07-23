import { FC, useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import clsx from 'clsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { SearchComponent } from '@/components/Input/Search'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'
import { useDrawerContext } from '../Modal/vaul/context'
import CheckboxRow from '../Pages/SwapHistory/Filters/CheckboxRow'

export type ScopeOption = { key: string, label: string, logo?: string }

export type NetworkScopeSelectorProps = {
    sectionLabel: string
    masterLabel: string
    /** Single-select disambiguation (Starknet/Fuel): no "all" master, picking one replaces. */
    overlapping: boolean
    options: ScopeOption[]
    selected: string[]
    onChange: (keys: string[]) => void
}

const OptionLogo: FC<{ option?: ScopeOption, size: number }> = ({ option, size }) =>
    option?.logo
        ? <ImageWithFallback src={option.logo} alt={option.label} width={size} height={size} className="rounded-md object-contain" />
        : <span style={{ width: size, height: size }} className="rounded-md bg-secondary-800" />

const StackedLogos: FC<{ options: ScopeOption[] }> = ({ options }) => (
    <span className="inline-flex items-center shrink-0">
        {options.slice(0, 3).map((o, i) => (
            <span key={o.key} className={clsx('inline-flex rounded-md ', i > 0 && '-ml-2')}>
                <OptionLogo option={o} size={20} />
            </span>
        ))}
    </span>
)

const RadioRow: FC<{ checked: boolean, onSelect: () => void, option: ScopeOption }> = ({ checked, onSelect, option }) => (
    <div
        role="radio"
        aria-checked={checked}
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
        className="w-full flex items-center gap-3 px-3 h-12 rounded-2xl text-base hover:bg-secondary-400 text-primary-text cursor-pointer select-none"
    >
        <span className="w-5 h-5 flex items-center justify-center shrink-0"><OptionLogo option={option} size={20} /></span>
        <span className="flex-1 min-w-0 truncate text-left">{option.label}</span>
        <span className={clsx('w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center', checked ? 'border-primary' : 'border-secondary-text')}>
            {checked && <span className="w-2 h-2 rounded-full bg-primary" />}
        </span>
    </div>
)

const describeSelection = (selected: string[], options: ScopeOption[], masterLabel: string): string => {
    if (selected.length === 0) return 'None selected'
    if (selected.length === options.length) return masterLabel
    if (selected.length <= 2) return options.filter(o => selected.includes(o.key)).map(o => o.label).join(', ')
    return `${selected.length} selected`
}

const NetworkScopeSelector: FC<NetworkScopeSelectorProps> = ({ sectionLabel, masterLabel, overlapping, options, selected, onChange }) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const { drawerRef, container: widget, modal } = useDrawerContext()

    if (options.length === 0) return null

    const allOn = selected.length === options.length
    const selectedOptions = options.filter(o => selected.includes(o.key))

    const toggle = (key: string) => {
        // Overlap is a single-select disambiguation — pick one, no toggling off.
        if (overlapping) { onChange([key]); return }
        // First pick out of the "all" state replaces it with just that option,
        // rather than producing a surprising "all-but-one" selection.
        if (allOn) { onChange([key]); return }
        const next = selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]
        // Deselecting the last option snaps back to "all" — an empty scope is meaningless.
        onChange(next.length === 0 ? options.map(o => o.key) : next)
    }
    const selectAll = () => onChange(allOn ? [] : options.map(o => o.key))

    const trimmedQuery = query.trim().toLowerCase()
    const filtered = !overlapping && trimmedQuery ? options.filter(o => o.label.toLowerCase().includes(trimmedQuery)) : options

    const showGlobe = allOn && !overlapping
    // Single-select overlap with nothing chosen yet needs a prompt, not "None selected".
    const placeholder = overlapping && selected.length === 0
    const triggerLabel = placeholder ? 'Select network' : describeSelection(selected, options, masterLabel)

    return (
        <div className="bg-secondary-500 rounded-2xl px-4 py-3">
            <div className="text-secondary-text text-sm mb-2.5"><span>{sectionLabel}</span></div>
            <Popover open={open} onOpenChange={v => { setOpen(v); if (!v) setQuery('') }}>
                <PopoverTrigger asChild>
                    <button type="button" className={clsx('w-full flex items-center justify-between gap-2 h-12 px-3 rounded-xl cursor-pointer text-primary-text transition-colors', open ? 'bg-secondary-200' : 'bg-secondary-300 hover:bg-secondary-200')}>
                        <span className="inline-flex items-center gap-2.5 text-base min-w-0">
                            {showGlobe && <Globe className="w-5 h-5 text-secondary-text shrink-0" />}
                            {!showGlobe && selectedOptions.length > 0 && <StackedLogos options={selectedOptions} />}
                            <span className={clsx('truncate', placeholder && 'text-secondary-text')}>{triggerLabel}</span>
                        </span>
                        <ChevronDown className={clsx('w-5 h-5 text-secondary-text shrink-0 transition-transform duration-200', open && 'rotate-180')} />
                    </button>
                </PopoverTrigger>
                <PopoverContent container={modal ? drawerRef.current : undefined} collisionBoundary={widget ?? undefined} collisionPadding={8} align="start" className="w-[var(--radix-popover-trigger-width)]! max-w-none! bg-secondary-500! p-0 rounded-2xl overflow-hidden">
                    {!overlapping && (
                        <div className="p-2 pb-1 border-b border-secondary-500">
                            <SearchComponent searchQuery={query} setSearchQuery={setQuery} placeholder="Search networks" containerClassName="mb-0 h-9 bg-secondary-300! focus-within:bg-secondary-200!" className="bg-transparent!" />
                        </div>
                    )}
                    <div className="overflow-y-auto styled-scroll p-1 max-h-60">
                        {!overlapping && (
                            <>
                                <CheckboxRow checked={allOn} onToggle={selectAll} icon={<Globe className="w-4 h-4 text-secondary-text" />} label={masterLabel} className="h-12 text-base" />
                                <div className="h-px bg-primary-text-tertiary/15 mx-3 my-1" />
                            </>
                        )}
                        {filtered.length === 0 ? (
                            <div className="flex items-center h-12 px-3 text-base text-secondary-text"><span>No networks found</span></div>
                        ) : overlapping ? (
                            filtered.map(o => (
                                <RadioRow key={o.key} checked={selected.includes(o.key)} onSelect={() => { toggle(o.key); setOpen(false) }} option={o} />
                            ))
                        ) : (
                            filtered.map(o => (
                                <CheckboxRow key={o.key} checked={selected.includes(o.key)} onToggle={() => toggle(o.key)} icon={<OptionLogo option={o} size={20} />} label={o.label} className="h-12 text-base" />
                            ))
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default NetworkScopeSelector
