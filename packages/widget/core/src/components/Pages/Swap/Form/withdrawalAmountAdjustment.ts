import { createContext, useContext } from 'react'
import type { SwapFormValues } from './SwapFormValues'

/** The form owns draft edits. Direct swap links deliberately have no callback. */
export type AdjustWithdrawalAmount = (updates: SwapFormValues) => SwapFormValues
export const WithdrawalAmountAdjustmentContext = createContext<AdjustWithdrawalAmount | undefined>(undefined)

export function useWithdrawalAmountAdjustment() {
    return useContext(WithdrawalAmountAdjustmentContext)
}
