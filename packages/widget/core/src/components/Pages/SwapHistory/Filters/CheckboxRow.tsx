import { Checkbox } from '@/components/shadcn/checkbox'
import { FC, ReactNode } from 'react'
import { cn } from '@/helpers/cn'

type CheckboxRowProps = {
    checked: boolean
    onToggle: () => void
    icon?: ReactNode
    label: string
    sublabel?: string
    className?: string
    disabled?: boolean
}

const CheckboxRow: FC<CheckboxRowProps> = ({ checked, onToggle, icon, label, sublabel, className, disabled = false }) => (
    <div
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : onToggle}
        onKeyDown={(e) => {
            if (disabled) return
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggle()
            }
        }}
        className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm text-primary-text select-none',
            disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-secondary-400 cursor-pointer',
            className,
        )}
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
