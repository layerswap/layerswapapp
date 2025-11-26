import { BalanceError, GasFeeError, WalletWithdrawalError, WidgetError } from "@layerswap/widget/types"
import posthog from "posthog-js"

export const logError = (e: WidgetError | BalanceError | GasFeeError | WalletWithdrawalError) => {
    console.log("got error message", e.message)
    console.log("got error stack", e.stack)
    console.log("got error cause", e.cause)
    console.log("got error name", e.name)
    console.log("got error type", e.type)
    console.log("got error", e)
    // posthog.capture(e.type, {
    //     name: e.name,
    //     message: e.message,
    //     stack: e.stack,
    //     cause: e.cause
    // })
}