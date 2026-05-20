import { FC } from 'react'

type NoMatchesProps = { onClear: () => void }

const NoMatches: FC<NoMatchesProps> = ({ onClear }) => (
    <div className="w-full flex flex-col items-center justify-center py-16 text-center">
        <p className="text-secondary-text text-base">No swaps match your filters</p>
        <button
            type="button"
            onClick={onClear}
            className="mt-4 inline-flex items-center gap-1 text-sm text-primary-text bg-secondary-500 hover:bg-secondary-400 px-3 py-2 rounded-lg"
        >
            <span>Clear filters</span>
        </button>
    </div>
)

export default NoMatches
