import { useContext, useEffect, useRef } from 'react'
import { useFormikContext } from 'formik'
import useSWR from 'swr'
import type { SwapFormValues } from './SwapFormValues'
import { SwapDataStateContext, SwapDataUpdateContext } from '@/context/swap'
import { useSelectedAccount } from '@/context/swapAccounts'
import useWallet from '@/hooks/useWallet'
import { transformFormValuesToQuoteArgs, useQuoteData } from '@/hooks/useFee'
import { useBalance } from '@/lib/balances/useBalance'
import { calculatePresetAmount, amountPresetSource, isAmountPreset, resolvePresetAmount, supportsLiveAmountPreset, AmountPresetUnavailableError, type AmountPreset } from '@/lib/amountPresets'
import { resolverService } from '@/lib/resolvers/resolverService'

/** Lives with Formik, including when the amount input unmounts in the deposit widget. */
export default function AmountPresetController() {
    const { values } = useFormikContext<SwapFormValues>()
    const updates = useContext(SwapDataUpdateContext)
    useEffect(() => {
        if (!isAmountPreset(values.amountMode)) updates?.syncAmountPresetDraft(values)
    }, [values, updates])
    return isAmountPreset(values.amountMode) ? <ActiveAmountPreset mode={values.amountMode} /> : null
}

function ActiveAmountPreset({ mode }: { mode: AmountPreset }) {
    const { values, setValues } = useFormikContext<SwapFormValues>()
    const swap = useContext(SwapDataStateContext)
    const updates = useContext(SwapDataUpdateContext)
    const account = useSelectedAccount('from', values.from?.name)
    const { wallets } = useWallet(values.from, 'withdrawal')
    const wallet = wallets.find(w => w.id === account?.id)
    const walletFlow = values.depositMethod === 'wallet'
    const source = amountPresetSource(values.from?.name, values.fromAsset?.symbol, walletFlow && wallet ? account?.id : undefined, walletFlow && wallet ? account?.address : undefined)
    const sameSource = source === values.amountPresetSource && (mode !== 'half' || (walletFlow && !!wallet))
    const frozen = !!swap?.amountPresetLocked
    const revision = swap?.amountPresetRevision ?? 0
    const previousRevision = useRef(revision)
    const needsBalance = walletFlow && !!wallet
    const liveSupported = !needsBalance || (!!values.from && !!values.fromAsset && supportsLiveAmountPreset(values.from, values.fromAsset))
    const { balances, error: balanceError } = useBalance(sameSource && liveSupported && !frozen && needsBalance ? account?.address : undefined, values.from, { refreshInterval: 20000, dedupeInterval: 20000 })
    const balance = balances?.find(b => b.network === values.from?.name && b.token === values.fromAsset?.symbol)
    const { maxAllowedAmount, minAllowedAmount, limitsError } = useQuoteData(
        !frozen && sameSource && liveSupported ? transformFormValuesToQuoteArgs(values) : undefined,
    )
    // The chosen preset and both limits identify the calculation. The amount is
    // intentionally excluded: applying a result must not start another request.
    const key = !frozen && sameSource && liveSupported && (!needsBalance || balance) && maxAllowedAmount !== undefined && minAllowedAmount !== undefined
        ? ['amount-preset', mode, source, values.depositMethod, balance?.amount, balance?.request_time, maxAllowedAmount, minAllowedAmount,
            values.to?.name, values.toAsset?.symbol, values.destination_address, !!values.refuel, revision]
        : null
    const { data: amount, error, isValidating } = useSWR<string>(key, () => needsBalance ? calculatePresetAmount({
        mode, network: values.from!, token: values.fromAsset!, balance,
        limit: maxAllowedAmount, minimum: minAllowedAmount, probeAmount: values.amount,
        estimateGas: async amount => resolverService.getGasResolver().getGas({
            address: account!.address, network: values.from!, token: values.fromAsset!, amount, wallet,
        }),
    }) : Promise.resolve(resolvePresetAmount(mode, maxAllowedAmount!, minAllowedAmount!, values.fromAsset!.decimals)),
    { refreshInterval: 60000, keepPreviousData: false, shouldRetryOnError: error => !(error instanceof AmountPresetUnavailableError), errorRetryCount: 3 })
    const retrying = !!error && isValidating
    const message = needsBalance && (balanceError || balance?.error) ? 'Balance unavailable'
        : limitsError ? 'Route limits unavailable'
        : error instanceof AmountPresetUnavailableError ? error.message
        : error && !retrying ? 'Network fee unavailable'
        : amount !== undefined && (Number(amount) <= 0 || (minAllowedAmount != null && Number(amount) < minAllowedAmount))
            ? (mode === 'half' ? 'Below minimum amount' : 'Insufficient balance') : undefined
    const pending = sameSource && !message && (amount === undefined || retrying)

    useEffect(() => {
        if (frozen) return
        if (!sameSource || !liveSupported) {
            const next = { ...values, amountMode: 'manual' as const, amountPresetSource: undefined, amountPresetError: undefined, amountPresetPending: false }
            if (updates?.syncAmountPresetDraft(next) === false) return
            void setValues(next, true)
            return
        }
        // Preserve a draft revised by the final check while its live calculation resumes.
        const preparedAmount = previousRevision.current !== revision && !swap?.swapId
            && swap?.swapBasicData?.amountPresetSource === values.amountPresetSource
            ? swap?.swapBasicData?.requested_amount : undefined
        previousRevision.current = revision
        const unavailableAmount = error instanceof AmountPresetUnavailableError ? error.amount : undefined
        const next = { ...values, amount: unavailableAmount ?? amount ?? preparedAmount ?? values.amount, amountPresetError: message, amountPresetPending: pending }
        if (updates?.syncAmountPresetDraft(next) === false) return
        if (next.amount !== values.amount || message !== values.amountPresetError || pending !== values.amountPresetPending)
            void setValues(next, true)
    }, [amount, error, message, pending, sameSource, liveSupported, frozen, values, setValues, updates, revision, swap?.swapId, swap?.swapBasicData])
    return null
}
