import posthog from "posthog-js"

type WithdrawalErrorContext = { swapId?: string; fromAddress?: string; toAddress?: string }

// Each provider binds its own exception type once; call sites stay `logWithdrawalError(error, ctx)`.
export const createWithdrawalErrorLogger = (exceptionType: string) =>
    (error: unknown, ctx: WithdrawalErrorContext) => {
        posthog.captureException(error, {
            $layerswap_exception_type: exceptionType,
            swapId: ctx.swapId,
            $fromAddress: ctx.fromAddress,
            $toAddress: ctx.toAddress,
        })
    }
