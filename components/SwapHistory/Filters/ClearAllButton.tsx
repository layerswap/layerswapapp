import { FC } from 'react'
import { X } from 'lucide-react'

type ClearAllButtonProps = {
    onClick: () => void
}

const ClearAllButton: FC<ClearAllButtonProps> = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label="Clear all filters"
        title="Clear all filters"
        className="shrink-0 ml-auto inline-flex items-center justify-center w-9 h-9 rounded-lg text-secondary-text hover:text-primary-text hover:bg-secondary-500 transition-colors"
    >
        <X className="w-4 h-4" />
    </button>
)

export default ClearAllButton
