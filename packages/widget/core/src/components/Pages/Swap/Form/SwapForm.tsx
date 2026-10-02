import { Formik, type FormikConfig, type FormikProps } from 'formik'
import { useCallback, type ReactNode } from 'react'
import { useCallbacks } from '@/context/callbackProvider'
import { lifecycleContextFromForm } from '@/lib/swapLifecycle'
import type { SwapFormValues } from './SwapFormValues'
import FormTelemetry from './FormTelemetry'

/**
 * 'deposit-address' is the Swap page tab; deposit-widget-* is the standalone
 * Deposit widget (Pages/Deposit).
 */
export type SwapFormMode = 'cross-chain' | 'exchange' | 'deposit-address' | 'deposit-widget-address' | 'deposit-widget-wallet'

type Props = Omit<FormikConfig<SwapFormValues>, 'onSubmit' | 'children'> & {
    mode: SwapFormMode
    /** onSwapLifecycle `path` for form_submitted */
    submitPath: string
    /** onSwapLifecycle `action` for form_submitted */
    submitAction?: string
    onSubmit: FormikConfig<SwapFormValues>['onSubmit']
    children: ReactNode | ((props: FormikProps<SwapFormValues>) => ReactNode)
}

/**
 * The only place `<Formik>` is instantiated for SwapFormValues
 * (tests/swap-form-owners.test.mjs). Owning the form here means every
 * surface gets the same three things without remembering them: the
 * widget_flow journey (FormTelemetry), the `[data-ls-form]` interaction
 * boundary, and one `form_submitted` per Formik submission, which is what
 * starts a new telemetry journey and lets `swap_created` attach to it.
 */
export default function SwapForm({ mode, submitPath, submitAction = 'submit', onSubmit, children, ...formik }: Props) {
    const { onSwapLifecycle } = useCallbacks()
    const handleSubmit = useCallback<FormikConfig<SwapFormValues>['onSubmit']>((values, helpers) => {
        onSwapLifecycle({
            step: 'form_submitted',
            stage: 'form',
            outcome: 'started',
            path: submitPath,
            action: submitAction,
            ...lifecycleContextFromForm(values),
        })
        // Always hand Formik a promise so isSubmitting resets even for a synchronous onSubmit.
        return Promise.resolve(onSubmit(values, helpers))
    }, [onSwapLifecycle, onSubmit, submitPath, submitAction])
    return (
        <Formik {...formik} onSubmit={handleSubmit}>
            {props => (
                // display:contents keeps layout. captureWidgetInteraction resolves the
                // boundary with Element.closest('[data-ls-form]'), so portaled drawers
                // rendered outside this subtree stay outside the form.
                <div data-ls-form={mode} className="contents">
                    <FormTelemetry mode={mode} />
                    {typeof children === 'function' ? children(props) : children}
                </div>
            )}
        </Formik>
    )
}
