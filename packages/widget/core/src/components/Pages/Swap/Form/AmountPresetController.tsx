import { useContext, useEffect, useRef } from 'react'
import { useFormikContext } from 'formik'
import useSWR from 'swr'
import type { SwapFormValues } from './SwapFormValues'
import type { GasWithToken } from '@layerswap/widget-types'
import { SwapDataStateContext, SwapDataUpdateContext } from '@/context/swap'
import { useSelectedAccount } from '@/context/swapAccounts'
import useWallet from '@/hooks/useWallet'
import { transformFormValuesToQuoteArgs, useQuoteData } from '@/hooks/useFee'
import { resolveQuoteError } from '@/hooks/useFormValidation'
import { useBalance } from '@/lib/balances/useBalance'
import { calculatePresetAmount, amountCalculationSnapshot, matchingAmountCalculation, amountPresetSource, isAmountPreset, isWalletAmountFlow, supportsLiveAmountPreset, AmountPresetUnavailableError, type AmountPreset } from '@/lib/amountPresets'
import { resolverService } from '@/lib/resolvers/resolverService'
import { minimumAmountMessage } from '@/lib/amountMessages'
import { useUsdModeStore } from '@/stores/usdModeStore'

/** Lives with Formik, including when the amount input unmounts in the deposit widget. */
export default function AmountPresetController() {
    const { values, setValues } = useFormikContext<SwapFormValues>()
    const updates = useContext(SwapDataUpdateContext)
    useEffect(() => {
        if (isAmountPreset(values.amountMode)) return
        const amountCalculation = values.amountMode === 'manual' ? undefined : matchingAmountCalculation(
            values.amountCalculation, values.amount, values.from?.name, values.fromAsset?.symbol,
        )
        const next = amountCalculation === values.amountCalculation ? values : { ...values, amountCalculation }
        if (updates?.syncAmountPresetDraft(next) === false) return
        if (next !== values) void setValues(next, false)
    }, [values, updates, setValues])
    return isAmountPreset(values.amountMode) ? <ActiveAmountPreset mode={values.amountMode} /> : null
}

function ActiveAmountPreset({ mode }: { mode: AmountPreset }) {
    const { values, setValues } = useFormikContext<SwapFormValues>()
    const swap = useContext(SwapDataStateContext)
    const updates = useContext(SwapDataUpdateContext)
    const account = useSelectedAccount('from', values.from?.name)
    const { wallets } = useWallet(values.from, 'withdrawal')
    const wallet = wallets.find(w => w.id === account?.id)
    const walletFlow = isWalletAmountFlow(values)
    const source = amountPresetSource(values.from?.name, values.fromAsset?.symbol, walletFlow && wallet ? account?.id : undefined, walletFlow && wallet ? account?.address : undefined)
    const sameSource = source === values.amountPresetSource && (mode !== 'half' || (walletFlow && !!wallet))
    const frozen = !!swap?.amountPresetLocked
    const revision = swap?.amountPresetRevision ?? 0
    const previousRevision = useRef(revision)
    const liveSupported = walletFlow && !!wallet && !!account?.address && !!values.from && !!values.fromAsset && supportsLiveAmountPreset(values.from, values.fromAsset)
    const { balances, error: balanceError, isLoading: balanceLoading } = useBalance(sameSource && liveSupported && !frozen ? account?.address : undefined, values.from, { refreshInterval: 20000, dedupeInterval: 20000 })
    const balance = balances?.find(b => b.network === values.from?.name && b.token === values.fromAsset?.symbol)
    // Provider-wide failures can resolve to an empty list without an error.
    const missingSettledBalance = !balanceLoading && balances !== undefined && !balance
    const isUsdMode = useUsdModeStore(s => s.isUsdMode)
    const { maxAllowedAmount, minAllowedAmount, minAllowedAmountInUsd, limitsError, quoteError } = useQuoteData(
        !frozen && sameSource && liveSupported ? transformFormValuesToQuoteArgs(values) : undefined,
    )
    // The chosen preset and both limits identify the calculation. The amount is
    // intentionally excluded: applying a result must not start another request.
    const key = !frozen && sameSource && liveSupported && balance && maxAllowedAmount !== undefined && minAllowedAmount !== undefined
        ? ['amount-preset', mode, source, values.depositMethod, balance?.amount, balance?.request_time, maxAllowedAmount, minAllowedAmount,
            values.to?.name, values.toAsset?.symbol, values.destination_address, !!values.refuel, revision]
        : null
    const { data: calculation, error, isValidating } = useSWR<{ amount: string; gas?: GasWithToken; snapshot: ReturnType<typeof amountCalculationSnapshot> }>(key, async () => {
        let gas: GasWithToken | undefined
        const amount = await calculatePresetAmount({
            mode, network: values.from!, token: values.fromAsset!, balance,
            limit: maxAllowedAmount, minimum: minAllowedAmount, probeAmount: values.amount,
            estimateGas: async amount => {
                gas = await resolverService.getGasResolver().getGas({
                    address: account!.address, network: values.from!, token: values.fromAsset!, amount, wallet,
                })
                return gas
            },
        })
        // Keep the fee with its calculation so the message uses the same snapshot.
        return { amount, gas, snapshot: amountCalculationSnapshot(amount, account, balance, gas, mode) }
    },
    { refreshInterval: 60000, keepPreviousData: false, shouldRetryOnError: error => !(error instanceof AmountPresetUnavailableError), errorRetryCount: 3 })
    const amount = calculation?.amount
    const gas = calculation?.gas
    const feeToken = gas?.token ?? values.from?.token
    const feeExhaustsBalance = !!gas && balance?.amount != null && balance.amount > 0
        && (!feeToken || feeToken.symbol === values.fromAsset?.symbol)
        && gas.gas * 1.02 + (gas.reserve ?? 0) >= balance.amount
    const retrying = !!error && isValidating
    const message = balanceError || balance?.error || missingSettledBalance ? 'Balance unavailable'
        : limitsError ? resolveQuoteError(quoteError ?? limitsError)?.message
        : error instanceof AmountPresetUnavailableError ? error.message
        : error && !retrying ? 'Network fee unavailable'
        : amount !== undefined && Number(amount) <= 0
            ? feeExhaustsBalance ? `Not enough ${feeToken?.symbol ?? values.fromAsset?.symbol} for network fees`
                : `Insufficient ${values.fromAsset?.symbol} balance`
        : amount !== undefined && minAllowedAmount != null && Number(amount) < minAllowedAmount
            ? minimumAmountMessage(minAllowedAmount, values.fromAsset, minAllowedAmountInUsd, isUsdMode) : undefined
    const pending = liveSupported && sameSource && !message && (amount === undefined || retrying)

    useEffect(() => {
        if (frozen) return
        if (!sameSource || !liveSupported) {
            // Detaching a wallet does not turn an unchanged preset amount into
            // manual input. Keep its original calculation for later diagnostics,
            // but never attach that provenance to a different asset or amount.
            const amountCalculation = matchingAmountCalculation(
                values.amountCalculation, values.amount, values.from?.name, values.fromAsset?.symbol,
            )
            const amountMode = !walletFlow || (sameSource && !liveSupported) || amountCalculation ? 'fixed' as const : 'manual' as const
            const next = { ...values, amountMode, amountCalculation, amountPresetSource: undefined, amountPresetError: undefined, amountPresetPending: false, amountPresetBalance: undefined }
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
        const next = { ...values, amount: unavailableAmount ?? amount ?? preparedAmount ?? values.amount, amountPresetError: message, amountPresetPending: pending, amountPresetBalance: balance?.amount, amountCalculation: calculation?.snapshot }
        if (updates?.syncAmountPresetDraft(next) === false) return
        if (next.amount !== values.amount || message !== values.amountPresetError || pending !== values.amountPresetPending || !Object.is(next.amountPresetBalance, values.amountPresetBalance) || next.amountCalculation !== values.amountCalculation)
            void setValues(next, true)
    }, [amount, calculation?.snapshot, error, message, pending, balance?.amount, sameSource, liveSupported, walletFlow, frozen, values, setValues, updates, revision, swap?.swapId, swap?.swapBasicData])
    return null
}
