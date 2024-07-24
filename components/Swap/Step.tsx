import { Check, X } from "lucide-react";
import { classNames } from "../utils/classNames";
import { Gauge } from "../gauge";
import { ProgressStatus, StatusStep } from "./Withdraw/Processing/types";

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
                    {step.hasSpinner && <Gauge value={40} size="verySmall" />}
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
                    <div className={`absolute top-1/2 right-8 -ml-px mt-0.5 h-[60%] w-0.5 opacity-10 ${step.status === "complete" ? "bg-primary" : "bg-primary/50"} `} aria-hidden="true" />
                )}
                <div className={`${step.status == 'upcoming' ? 'bg-secondary-900' : 'bg-secondary-700'} rounded-lg px-4 py-4 border ${step.status == 'current' ? 'border-primary/25' : 'border-secondary-500'} w-full relative z-10`}>
                    <div className={`group relative space-x-3 flex ${step?.description ? "items-start" : "items-center"}`} >
                        <div className="font-normal flex flex-col w-full relative z-10 space-y-4">
                            <div className="flex items-center justify-between w-full grow">
                                <div className="flex items-center gap-3 w-full">
                                    <span className="flex min-w-0 flex-col space-y-2 w-full">
                                        <span className={`text-sm font-medium ${step.status === "current" ? "text-primary" : step.status === "upcoming" ? "text-secondary-text/70" : "text-primary-text"}`}>{step.name}</span>
                                        {
                                            step?.description &&
                                            <span className="text-sm text-secondary-text">{step?.description}</span>
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className="flex h-9 items-center text-primary-text self-end" aria-hidden="true">
                            {renderStepIcon(step)}
                        </span>
                    </div>
                </div>
            </div>
        </li >

    );
}

export default Step;