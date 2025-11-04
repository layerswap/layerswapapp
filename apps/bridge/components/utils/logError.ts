import { BalanceError, GasFeeError, OnLongTransactionWarning, WalletWithdrawalError, WidgetError } from "@layerswap/widget/types"
import posthog from "posthog-js"

export const logError = (e: WidgetError | BalanceError | GasFeeError | WalletWithdrawalError | OnLongTransactionWarning) => {
    posthog.capture(e.type, {
        name: e.name,
        message: e.message,
        stack: e.stack,
        cause: e.cause,
        where: e.where,
        severity: e.severity,
    })
}