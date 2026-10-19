let executionOwner: symbol | undefined
/** In-memory guard against overlapping wallet prompts. */
export function acquireWalletExecution(): (() => void) | undefined {
    if (executionOwner) return undefined
    const owner = Symbol('wallet-execution')
    executionOwner = owner
    return () => { if (executionOwner === owner) executionOwner = undefined }
}
