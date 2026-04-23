import { FC } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { filterChipClasses } from './chipStyles'

type IncompleteToggleProps = {
    hideIncomplete: boolean
    setHideIncomplete: (v: boolean) => void
    showDot: boolean
}

const IncompleteToggle: FC<IncompleteToggleProps> = ({ hideIncomplete, setHideIncomplete, showDot }) => (
    <div className="relative">
        <button
            type="button"
            onClick={() => setHideIncomplete(!hideIncomplete)}
            className={filterChipClasses(hideIncomplete)}
        >
            {hideIncomplete ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>Incomplete</span>
        </button>
        {showDot ? (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />
        ) : null}
    </div>
)

export default IncompleteToggle
