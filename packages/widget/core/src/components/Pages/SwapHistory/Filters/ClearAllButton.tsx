import { FC } from 'react'

type ClearAllButtonProps = {
    onClick: () => void
}

const ClearAllButton: FC<ClearAllButtonProps> = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-label="Clear all filters"
        title="Clear all filters"
        className="shrink-0 inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm text-secondary-text hover:text-primary-text hover:bg-secondary-500 transition-colors"
    >
        <span>Clear</span>
    </button>
)

export default ClearAllButton
