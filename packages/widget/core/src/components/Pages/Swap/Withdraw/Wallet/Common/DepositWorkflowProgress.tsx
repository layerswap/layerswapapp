import { FC } from "react";
import { Check, X } from "lucide-react";
import { DepositAction } from "@/lib/apiClients/layerSwapApiClient";
import clsx from "clsx";
import { Gauge } from "../../Processing/gauge";

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
    const currentAction = currentIndex >= 0 ? steps[currentIndex] : undefined
    const currentDescription = currentAction ? (actionStateText || getStepDescription(currentAction)) : undefined

    return <section className="rounded-2xl bg-secondary-500 px-4 pb-4 pt-3.5" aria-label="Wallet confirmation progress">
        <div className="mb-2.5 flex items-center gap-3">
            <span className="h-px flex-1 bg-secondary-400" />
            <h3 className="shrink-0 text-sm font-normal text-secondary-text text-balance">Continue in your wallet</h3>
            <span className="h-px flex-1 bg-secondary-400" />
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
            {currentAction
                ? `Step ${currentIndex + 1} of ${steps.length}: ${getDepositActionLabel(currentAction)}. ${currentDescription ?? ''}`
                : 'Wallet confirmation steps complete.'}
        </p>
        <div className="relative">
            <span className="absolute bottom-5 left-4 top-5 w-px bg-secondary-400" aria-hidden="true" />
            <ol role="list">
            {steps.map((action, index) => {
                const completed = action.status === 'completed'
                const active = index === currentIndex
                const failed = action.status === 'failed'
                const isPending = active && (action.status === 'pending' || !!isExecuting)
                const description = active ? currentDescription : undefined
                const hasDescription = !!description

                return <li
                    key={`${action.step}-${index}`}
                    className={clsx(
                        "relative z-10 grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-0.5",
                        hasDescription ? "items-start" : "items-center",
                    )}
                    aria-current={active ? 'step' : undefined}
                >
                    <span className={clsx(
                        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-500",
                        hasDescription && "mt-2.5",
                        completed && "text-primary",
                        failed && "bg-error-background text-error-foreground",
                        active && !failed && !isPending && "text-primary ring-1 ring-inset ring-primary/20",
                        isPending && "text-primary",
                        !completed && !failed && !active && "text-secondary-text ring-1 ring-inset ring-secondary-400",
                    )} aria-hidden="true">
                        {completed || (active && !failed && !isPending)
                            ? <span className={clsx("absolute inset-0 rounded-full", completed ? "bg-primary/20" : "bg-primary/15")} />
                            : null}
                        {completed
                            ? <Check className="relative z-10 h-4 w-4" aria-hidden="true" />
                            : failed
                                ? <X className="relative z-10 h-4 w-4" aria-hidden="true" />
                                : isPending
                                    ? <span className="relative z-10 animate-spin motion-reduce:animate-none"><Gauge value={40} size="tiny" /></span>
                                    : <span className="relative z-10 h-2 w-2 rounded-full bg-current" aria-hidden="true" />}
                    </span>
                    <span className={clsx(
                        "min-w-0 rounded-xl px-3 py-2.5 transition-colors duration-200 motion-reduce:transition-none",
                        active && "bg-secondary-400/50",
                    )}>
                        <span className={clsx(
                            "flex min-w-0 items-center justify-between gap-3 text-sm",
                            active && "font-medium text-primary-text",
                            failed && "font-medium text-error-foreground",
                            !active && !failed && "text-secondary-text",
                        )}>
                            <span className="min-w-0 break-words">
                                <span className="sr-only">{completed ? 'Completed: ' : failed ? 'Failed: ' : active ? 'Current step: ' : 'Upcoming: '}</span>
                                {getDepositActionLabel(action)}
                            </span>
                            {active ? <span className="shrink-0 text-xs font-normal tabular-nums text-secondary-text">Step {index + 1} of {steps.length}</span> : null}
                        </span>
                        {description ? <span className="mt-1 block break-words text-xs leading-4 text-secondary-text">{description}</span> : null}
                    </span>
                </li>
            })}
            </ol>
        </div>
        {failedStep?.detail ?
            <p className="mt-2 text-xs leading-4 text-error-foreground">{failedStep.detail}</p>
            : null}
    </section>
}

export default DepositWorkflowProgress
