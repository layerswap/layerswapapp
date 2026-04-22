import { FC, ReactNode } from 'react'
import { Checkbox } from '../../shadcn/checkbox'

type CheckboxRowProps = {
    checked: boolean
    onToggle: () => void
    icon?: ReactNode
    label: string
    sublabel?: string
}

const CheckboxRow: FC<CheckboxRowProps> = ({ checked, onToggle, icon, label, sublabel }) => (
    <div
        role="checkbox"
        aria-checked
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggle()
            }
        }}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm hover:bg-secondary-400 text-primary-text cursor-pointer select-none"
    >
        {icon ? <span className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</span> : null}
        <span className="flex-1 min-w-0 text-left">
            <span className="block truncate">{label}</span>
            {sublabel ? <span className="block text-xs text-secondary-text truncate">{sublabel}</span> : null}
        </span>
        <Checkbox checked={checked} className="pointer-events-none w-4 h-4 shrink-0" />
    </div>
)

export default CheckboxRow
