/**
 * Generic multi-step transfer state
 * TStep: The type representing transfer steps (can be string, enum, etc.)
 * TContext: The context data needed for the transfer
 */
export type MultiStepTransferState<TStep = string, TContext = any> = {
    currentStep: TStep
    completedSteps: TStep[]
    stepData?: TContext
    error?: Error
}

/**
 * Base interface for multi-step transfer providers
 * TStep: The type representing transfer steps for this specific network
 * TContext: The context data specific to this network
 */
export interface MultiStepTransferProvider<TStep = string, TContext = any> {
    // Get current state
    getState(): MultiStepTransferState<TStep, TContext>

    // Execute next step
    executeNextStep(context: TContext): Promise<MultiStepTransferState<TStep, TContext>>

    // Check if step is required
    isStepRequired(step: TStep): Promise<boolean>

    // Reset state to initial step
    reset(initialStep: TStep): void
}

/**
 * Generic multi-step transfer params
 */
export type MultiStepTransferParams<TStep = string, TContext = any> = {
    context: TContext
    onStepComplete?: (step: TStep, state: MultiStepTransferState<TStep, TContext>) => void
    onError?: (error: Error) => void
}
