// Dependency-free so lib/swapLifecycle (a leaf imported by the deposit/transfer execution
// paths and their headless tests) can key its phase table on the enum without pulling the
// API client graph behind resolveSwapPhase.
export enum SwapPhase {
    AwaitingUserDeposit = 'awaiting_user_deposit',
    InputPending = 'input_pending',
    OutputPending = 'output_pending',
    SettlingOutput = 'settling_output',
    Completed = 'completed',
    Failed = 'failed',
    Expired = 'expired',
    PendingRefund = 'pending_refund',
    Refunded = 'refunded',
}

export const TERMINAL_PHASES: ReadonlySet<SwapPhase> = new Set([
    SwapPhase.Completed,
    SwapPhase.Failed,
    SwapPhase.Expired,
    SwapPhase.Refunded,
]);
