import { Check, X, XCircle } from "lucide-react";
import { classNames } from "../utils/classNames";

function renderStepIcon(step) {
    switch (step.status) {
        case "complete":
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <Check className="h-5 w-5 text-primary-text" aria-hidden="true" />
                </span>
            );

        case "current":
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping absolute" />
                </span>
            );

        case "failed":
            return <XCircle className="h-8 w-8 text-red-600" aria-hidden="true" />;

        case "delayed":
            return <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary opacity-40">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping absolute" />
            </span>;

        default:
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 opacity-60">
                    <span className="font-semibold">{step?.index}</span>
                </span>
            );
    }
}

function Step({ step, isLastStep }) {
    return (
        <li className={classNames(isLastStep ? '' : 'pb-10', 'relative')} key={step?.name}>
            <div className="flex items-center justify-between w-full">
                {!isLastStep && (
                    <div className={`absolute top-1/2 left-4 -ml-px mt-0.5 h-[40%] w-0.5 ${step.status === "complete" ? "bg-primary" : "bg-gray-300"} opacity-60`} aria-hidden="true" />
                )}
                <div className={`group relative flex ${step?.description ? "items-start" : "items-center"}`}>
                    <span className="flex h-9 items-center text-primary-text" aria-hidden="true">
                        {renderStepIcon(step)}
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                        <span className={`text-sm font-medium ${step.status === "current" ? "text-primary" : "text-primary-text"}`}>{step.name}</span>
                        {step?.description &&
                            <span className="text-sm text-secondary-text">{step?.description}</span>}
                    </span>
                </div>
            </div>
        </li>
    );
}

export default Step;