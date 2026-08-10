export type MultiStepTransferState<TStep = string, TContext = any> = {
  currentStep: TStep;
  completedSteps: TStep[];
  stepData?: TContext;
  error?: Error;
};

export interface MultiStepTransferProvider<TStep = string, TContext = any> {
  getState(): MultiStepTransferState<TStep, TContext>;
  executeNextStep(context: TContext): Promise<MultiStepTransferState<TStep, TContext>>;
  isStepRequired(step: TStep): Promise<boolean>;
  reset(initialStep: TStep): void;
}

export type MultiStepTransferParams<TStep = string, TContext = any> = {
  context: TContext;
  onStepComplete?: (step: TStep, state: MultiStepTransferState<TStep, TContext>) => void;
  onError?: (error: Error) => void;
};
