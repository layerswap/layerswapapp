import { Check, X } from "lucide-react";
import { classNames } from "../../../../utils/classNames";
import { Gauge } from "./gauge";
import { ProgressStatus, StatusStep } from "./types";

function renderStepIcon(step: StatusStep) {
    switch (step.status) {
        case ProgressStatus.Complete:
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                    <Check className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
            );

        case ProgressStatus.Current:
            return (
                <span className="animate-spin">
                    <Gauge value={40} size="verySmall" />
                </span>
            );

        case ProgressStatus.Failed:
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                    <X className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
            );
        case ProgressStatus.Delayed:
            return (
                <span className="animate-spin opacity-50">
                    <Gauge value={40} size="verySmall" />
                </span>)

        default:
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20">
                </span>
            );
    }
}

function Step({ step, isLastStep }: { step: StatusStep, isLastStep: boolean }) {
    return (
        <li className={classNames(isLastStep ? '' : 'pb-10', 'relative')} key={step?.name}>
            <div className="flex items-center justify-between w-full">
                {!isLastStep && (
                    <div className={`absolute top-1/2 left-4 -ml-px mt-0.5 h-[40%] w-0.5 ${step.status === "complete" ? "bg-primary" : "bg-primary/20"} `} aria-hidden="true" />
                )}
                <div className={`group relative flex ${step?.description ? "items-start" : "items-center"}`}>
                    <span className="flex h-9 items-center text-primary-text" aria-hidden="true">
                        {renderStepIcon(step)}
                    </span>
                    <span className="ml-3 flex min-w-0 flex-col">
                        <span className={`text-sm font-medium ${step.status === "current" ? "text-primary" : step.status === "upcoming" ? "text-secondary-text/70" : "text-primary-text"}`}>{step.name}</span>
                        {step?.description &&
                            <span className="text-sm text-secondary-text">{step?.description}</span>}
                    </span>
                </div>
            </div>
        </li>
    );
}

export default function Steps({ steps }: { steps: StatusStep[] }) {
    return (
      <nav aria-label="Progress">
        <ol role="list" className="overflow-hidden">
          {steps.map((step, index) => (
            <Step key={index} step={step} isLastStep={index === steps.length - 1} />
          ))}
        </ol>
      </nav>
    );
  }