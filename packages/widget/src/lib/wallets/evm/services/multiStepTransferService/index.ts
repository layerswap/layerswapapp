import { 
    MultiStepTransferProvider, 
    MultiStepTransferState, 
} from "@/types/multiStepTransfer"

/**
 * Abstract base class for multi-step EVM-based transfer flows
 * This provides a reusable framework for networks like Loopring, ZkSync, and Paradex
 * that require multi-step authorization/activation before transfers
 * 
 * @template TStep - The step type for this specific network (enum, string union, etc.)
 * @template TContext - The context data type for this specific network
 */
export abstract class AbstractMultiStepEVMTransferService<TStep, TContext> 
    implements MultiStepTransferProvider<TStep, TContext> {
    
    protected state: MultiStepTransferState<TStep, TContext>

    constructor(initialStep: TStep) {
        this.state = {
            currentStep: initialStep,
            completedSteps: [],
            stepData: undefined
        }
    }

    getState(): MultiStepTransferState<TStep, TContext> {
        return this.state
    }

    abstract isStepRequired(step: TStep): Promise<boolean>
    
    abstract executeNextStep(context: TContext): Promise<MultiStepTransferState<TStep, TContext>>

    reset(initialStep: TStep): void {
        this.state = {
            currentStep: initialStep,
            completedSteps: [],
            stepData: undefined
        }
    }

    /**
     * Update state helper
     */
    protected updateState(
        currentStep: TStep,
        stepData?: TContext,
        error?: Error
    ): MultiStepTransferState<TStep, TContext> {
        const completedSteps = error
            ? this.state.completedSteps
            : [...this.state.completedSteps, this.state.currentStep]

        this.state = {
            currentStep,
            completedSteps,
            stepData: stepData ?? this.state.stepData,
            error
        }

        return this.state
    }

    /**
     * Execute all steps sequentially
     * This is a convenience method for automated flow execution
     */
    async executeAll(context: TContext, completeStep: TStep, errorStep: TStep): Promise<MultiStepTransferState<TStep, TContext>> {
        let currentContext = context
        
        while (this.state.currentStep !== completeStep && this.state.currentStep !== errorStep) {
            const result = await this.executeNextStep(currentContext)
            currentContext = result.stepData ?? currentContext
        }
        
        return this.state
    }
}

/**
 * Helper to determine next step based on requirements
 * 
 * @param service - The multi-step service instance
 * @param possibleSteps - Array of possible next steps to check in order
 * @param finalStep - The step to return if none of the possible steps are required
 */
export async function determineNextStep<TStep, TContext>(
    service: MultiStepTransferProvider<TStep, TContext>,
    possibleSteps: TStep[],
    finalStep: TStep
): Promise<TStep> {
    for (const step of possibleSteps) {
        if (await service.isStepRequired(step)) {
            return step
        }
    }
    return finalStep
}
