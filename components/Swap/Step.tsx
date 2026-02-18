import { Check, X } from "lucide-react";
import { classNames } from "../utils/classNames";
import { Gauge } from "../gauge";
import { ProgressStatus, StatusStep } from "./Withdraw/Processing/types";
import clsx from "clsx";

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
                    <div className={clsx(`absolute top-1/2 left-4 -ml-px mt-0.5 h-[40%] w-0.5 `, {
                        "bg-primary/20": step.status !== "complete" && step.status !== "failed",
                        "bg-primary": step.status === "complete" || step.status === "failed"
                    })}
                        aria-hidden="true" />
                )}
                <div className={clsx(`group relative flex `, {
                    "items-start": step?.description,
                    "items-center": !step?.description
                })}>
                    <span className="flex h-9 items-center text-primary-text" aria-hidden="true">
                        {renderStepIcon(step)}
                    </span>
                    <span className="ml-3 flex min-w-0 flex-col">
                        <span className={clsx(`text-sm font-medium`, {
                            "text-primary": step.status === "current",
                            "text-secondary-text/70": step.status === "upcoming",
                            "text-primary-text": step.status !== "current" && step.status !== "upcoming"
                        })}>
                            {step.name}
                        </span>
                        {
                            step?.description &&
                            <div className="text-sm text-secondary-text">{step?.description}</div>
                        }
                    </span>
                </div>
            </div>
        </li>
    );
}

export default Step;