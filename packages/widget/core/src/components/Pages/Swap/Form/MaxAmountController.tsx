import { useContext, useEffect, useRef } from 'react'
import { useFormikContext } from 'formik'
import useSWR from 'swr'
import type { SwapFormValues } from './SwapFormValues'
import { SwapDataStateContext, SwapDataUpdateContext } from '@/context/swap'
import { useSelectedAccount } from '@/context/swapAccounts'
import useWallet from '@/hooks/useWallet'
import { transformFormValuesToQuoteArgs, useQuoteData } from '@/hooks/useFee'
import { useBalance } from '@/lib/balances/useBalance'
import { calculateMaxAmount, maxAmountSource } from '@/lib/maxAmount'
import { resolverService } from '@/lib/resolvers/resolverService'

/** Lives with Formik, including when the amount input unmounts in the deposit widget. */
export default function MaxAmountController() {
    const { values } = useFormikContext<SwapFormValues>()
    const updates = useContext(SwapDataUpdateContext)
    useEffect(() => {
        if (values.amountMode !== 'max') updates?.syncMaxAmountDraft(values)
    }, [values, updates])
    return values.amountMode === 'max' ? <ActiveMaxAmount /> : null
}

function ActiveMaxAmount() {
    const { values, setValues } = useFormikContext<SwapFormValues>()
    const swap = useContext(SwapDataStateContext)
    const updates = useContext(SwapDataUpdateContext)
    const account = useSelectedAccount('from', values.from?.name)
    const { wallets } = useWallet(values.from, 'withdrawal')
    const wallet = wallets.find(w => w.id === account?.id)
    const source = maxAmountSource(values.from?.name, values.fromAsset?.symbol, account?.id, account?.address)
    const sameSource = source === values.maxAmountSource && !!wallet && values.depositMethod === 'wallet'
    const frozen = !!swap?.maxAmountLocked
    const revision = swap?.maxAmountRevision ?? 0
    const previousRevision = useRef(revision)
    const { balances, error: balanceError } = useBalance(sameSource && !frozen ? account?.address : undefined, values.from, { refreshInterval: 20000, dedupeInterval: 20000 })
    const balance = balances?.find(b => b.network === values.from?.name && b.token === values.fromAsset?.symbol)
    const { maxAllowedAmount, minAllowedAmount, limitsError } = useQuoteData(
        !frozen && sameSource ? transformFormValuesToQuoteArgs(values) : undefined,
    )
    // Amount intentionally isn't in this key. The bounded solver owns amount-dependent
    // fee estimation; writing its result to Formik must not start another request.
    const key = !frozen && sameSource && balance && maxAllowedAmount !== undefined
        ? ['using-max', source, balance.amount, balance.request_time, maxAllowedAmount, values.to?.name,
            values.toAsset?.symbol, values.destination_address, !!values.refuel, swap?.maxAmountRevision ?? 0]
        : null
    const { data: amount, error: gasError, isValidating } = useSWR<string>(key, () => calculateMaxAmount({
        network: values.from!, token: values.fromAsset!, balance,
        limit: maxAllowedAmount, probeAmount: values.amount,
        estimateGas: async amount => resolverService.getGasResolver().getGas({
            address: account!.address, network: values.from!, token: values.fromAsset!, amount, wallet,
        }),
    }), { refreshInterval: 60000, keepPreviousData: false, shouldRetryOnError: true, errorRetryCount: 3 })
    const retryingFee = !!gasError && isValidating
    const message = balanceError || balance?.error ? 'Balance unavailable'
        : limitsError ? 'Route limits unavailable'
        : gasError && !retryingFee ? 'Network fee unavailable'
        : amount !== undefined && (Number(amount) <= 0 || (minAllowedAmount != null && Number(amount) < minAllowedAmount))
            ? 'Insufficient balance' : undefined
    const pending = sameSource && !message && (amount === undefined || retryingFee)

    useEffect(() => {
        if (frozen) return
        if (!sameSource) {
            const next = { ...values, amountMode: 'manual' as const, maxAmountSource: undefined, maxAmountError: undefined, maxAmountPending: false }
            if (updates?.syncMaxAmountDraft(next) === false) return
            void setValues(next, true)
            return
        }
        // A final affordability check can lower the modal draft while Formik is
        // frozen. Preserve that reviewed amount while the live calculation resumes.
        const preparedAmount = previousRevision.current !== revision && !swap?.swapId
            && swap?.swapBasicData?.maxAmountSource === values.maxAmountSource
            ? swap?.swapBasicData?.requested_amount : undefined
        previousRevision.current = revision
        const next = { ...values, amount: amount ?? preparedAmount ?? values.amount, maxAmountError: message, maxAmountPending: pending }
        if (updates?.syncMaxAmountDraft(next) === false) return
        if (next.amount !== values.amount || message !== values.maxAmountError || pending !== values.maxAmountPending)
            void setValues(next, true)
    }, [amount, message, pending, sameSource, frozen, values, setValues, updates, revision, swap?.swapId, swap?.swapBasicData])
    return null
}
