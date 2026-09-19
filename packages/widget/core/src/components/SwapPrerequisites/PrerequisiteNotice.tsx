import { Loader2 } from 'lucide-react'
import SubmitButton from '../Buttons/submitButton'
import type { useSwapPrerequisites } from '../../hooks/useSwapPrerequisites'

/** Payment-time checks may send the user back to the form; setup actions live there. */
export function PrerequisiteNotice({ state, onEdit }: {
    state: ReturnType<typeof useSwapPrerequisites>
    onEdit: () => void
}) {
    if (!state.entries) return <div role="status" className="flex items-center gap-2 rounded-xl bg-secondary-500 p-4 text-sm text-secondary-text">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking account setup…</span>
    </div>
    return <div className="space-y-3 rounded-xl bg-secondary-500 p-4">
        <p role="status" className="font-medium text-primary-text">{state.blockingMessage}</p>
        <p className="text-sm text-secondary-text">Complete account setup in the form before continuing.</p>
        <SubmitButton type="button" onClick={onEdit}>Back to form</SubmitButton>
    </div>
}
