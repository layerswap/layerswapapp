import { isAmountPreset } from '@/lib/amountPresets';
import { Formik, type FormikConfig, type FormikProps } from 'formik'
import { useCallback, type ReactNode } from 'react'
import { useCallbacks } from '@/context/callbackProvider'
import { lifecycleBalanceContext, lifecycleContextFromForm } from '@/lib/swapLifecycle'
import type { SwapFormValues } from './SwapFormValues'
import FormTelemetry from './FormTelemetry'
import { useSwapAccounts } from '@/context/swapAccounts'
import { getKey, useBalanceStore } from '@/stores/balanceStore'
import AmountPresetController from './AmountPresetController'

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
    const accounts = useSwapAccounts('from')
    const handleSubmit = useCallback<FormikConfig<SwapFormValues>['onSubmit']>((values, helpers) => {
        if (isAmountPreset(values.amountMode) && (values.amountPresetPending || values.amountPresetError)) return Promise.resolve()
        const account = values.depositMethod === 'wallet' && !values.fromExchange
            ? accounts.find(a => a.provider.withdrawalSupportedNetworks?.includes(values.from?.name ?? '')) : undefined
        const balances = account && values.from ? useBalanceStore.getState().balances[getKey(account.address, values.from)]?.data?.balances : undefined
        const balance = balances?.find(b => b.network === values.from?.name && b.token === values.fromAsset?.symbol)
        onSwapLifecycle({
            step: 'form_submitted',
            stage: 'form',
            outcome: 'started',
            path: submitPath,
            action: submitAction,
            ...lifecycleContextFromForm(values),
            ...lifecycleBalanceContext(account?.address, balance),
        })
        // Always hand Formik a promise so isSubmitting resets even for a synchronous onSubmit.
        return Promise.resolve(onSubmit(values, helpers))
    }, [onSwapLifecycle, onSubmit, submitPath, submitAction, accounts])
    return (
        <Formik {...formik} onSubmit={handleSubmit}>
            {props => (
                // display:contents keeps layout. captureWidgetInteraction resolves the
                // boundary with Element.closest('[data-ls-form]'), so portaled drawers
                // rendered outside this subtree stay outside the form.
                <div data-ls-form={mode} className="contents">
                    <FormTelemetry mode={mode} />
                    <AmountPresetController />
                    {typeof children === 'function' ? children(props) : children}
                </div>
            )}
        </Formik>
    )
}
