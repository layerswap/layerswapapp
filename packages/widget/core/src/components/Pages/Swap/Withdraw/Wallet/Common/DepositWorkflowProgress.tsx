import { FC } from "react";
import { Check, Loader2, X } from "lucide-react";
import { DepositAction } from "@/lib/apiClients/layerSwapApiClient";

const DEPOSIT_STEP_LABELS: Record<string, string> = {
    approve_permit2: 'Approve in wallet',
    sign: 'Sign message',
    publish: 'Confirm swap',
    deposit: 'Send deposit',
}

const getDepositStepLabel = (step: string): string => DEPOSIT_STEP_LABELS[step] ?? step

const getDepositActionLabel = (action: DepositAction): string =>
    getDepositStepLabel(action.step ?? 'Continue')

const getStepDescription = (action: DepositAction): string | undefined => {
    switch (action.step) {
        case 'approve_permit2':
            return action.token?.symbol
                ? `Allow ${action.token.symbol} for this swap`
                : 'Allow the token for this swap'
        case 'sign':
            return 'Confirm the swap authorization'
        case 'publish':
            return 'Submit the swap transaction'
        case 'deposit':
            return 'Send funds to start the swap'
        default:
            return undefined
    }
}

type Props = {
    actions: DepositAction[] | undefined
    isExecuting?: boolean
    actionStateText?: string
}

const DepositWorkflowProgress: FC<Props> = ({ actions, isExecuting, actionStateText }) => {
    const steps = actions?.filter((action): action is DepositAction & { step: string } => !!action.step) ?? []
    if (steps.length < 2) return null
    const failedStep = steps.find(action => action.status === 'failed')
    const currentIndex = steps.findIndex(action => action.status === 'action_required' || action.status === 'pending' || action.status === 'failed')

    return <section className="rounded-2xl bg-secondary-500 px-4 py-3.5" aria-label="Swap progress" aria-live="polite">
        <div className="mb-3 flex items-center gap-3 text-sm text-secondary-text">
            <span className="h-px flex-1 bg-secondary-400" />
            <span className="shrink-0">Continue in your wallet</span>
            <span className="h-px flex-1 bg-secondary-400" />
        </div>
        <ol className="space-y-1">
            {steps.map((action, index) => {
                const completed = action.status === 'completed'
                const active = index === currentIndex
                const failed = action.status === 'failed'
                const isPending = active && (action.status === 'pending' || !!isExecuting)
                const description = active ? (actionStateText || getStepDescription(action)) : undefined

                return <li key={`${action.step}-${index}`} className="flex min-h-12 items-start gap-3 py-1.5" aria-current={active ? 'step' : undefined}>
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${completed ? 'bg-success-background text-success-foreground' : failed ? 'bg-error-background text-error-foreground' : active ? 'bg-primary/15 text-primary' : 'text-secondary-text'}`}>
                        {completed
                            ? <Check className="h-4 w-4" aria-hidden="true" />
                            : failed
                                ? <X className="h-4 w-4" aria-hidden="true" />
                                : isPending
                                    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    : <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className={`flex items-center justify-between gap-3 text-sm ${active ? 'font-medium text-primary-text' : failed ? 'text-error-foreground' : 'text-secondary-text'}`}>
                            <span>{getDepositActionLabel(action)}</span>
                            {active ? <span className="shrink-0 text-xs font-normal text-secondary-text">Step {index + 1} of {steps.length}</span> : null}
                        </span>
                        {description ? <span className="mt-0.5 block text-xs leading-4 text-secondary-text">{description}</span> : null}
                    </span>
                </li>
            })}
        </ol>
        {failedStep?.detail ?
            <p className="mt-2 text-xs leading-4 text-error-foreground">{failedStep.detail}</p>
            : null}
    </section>
}

export default DepositWorkflowProgress
