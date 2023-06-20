import { Check } from "lucide-react";
import { classNames } from "../utils/classNames";

export default function Steps({ steps }) {
    return (<div className="bg-secondary-700 font-normal px-3 py-5 rounded-lg flex flex-col border border-secondary-500 w-full relative z-10">
        <nav aria-label="Progress">
            <ol role="list" className="overflow-hidden">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className={classNames(stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative')}>
                        <div className="flex items-center justify-between w-full">
                            {step?.status === 'complete' ? (
                                <>
                                    {stepIdx !== steps.length - 1 ? (
                                        <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-primary" aria-hidden="true" />
                                    ) : null}
                                    <div className="group relative flex items-start">
                                        <span className="flex h-9 items-center">
                                            <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full  bg-primary">
                                                <Check className="h-5 w-5 text-white" aria-hidden="true" />
                                            </span>
                                        </span>
                                        <span className="ml-4 flex min-w-0 flex-col">
                                            <span className="text-sm font-medium text-gray-300">{step.name}</span>
                                            <span className="text-sm text-primary-text">{step.description}</span>
                                        </span>
                                    </div>
                                </>
                            ) : step?.status === 'current' ? (
                                <>
                                    {stepIdx !== steps.length - 1 ? (
                                        <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                                    ) : null}
                                    <div className="group relative flex items-start" aria-current="step">
                                        <span className="flex h-9 items-center" aria-hidden="true">
                                            <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-white">
                                                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping absolute" />
                                            </span>
                                        </span>
                                        <span className="ml-4 flex min-w-0 flex-col">
                                            <span className="text-sm font-medium text-primary">{step.name}</span>
                                            <span className="text-sm text-primary-text">{step.description}</span>
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {stepIdx !== steps.length - 1 ? (
                                        <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                                    ) : null}
                                    <div className="group relative flex items-start">
                                        <span className="flex h-9 items-center" aria-hidden="true">
                                            <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                                                <span className="h-2.5 w-2.5 rounded-full bg-transparent " />
                                            </span>
                                        </span>
                                        <span className="ml-4 flex min-w-0 flex-col">
                                            <span className="text-sm font-medium text-primary-text">{step.name}</span>
                                            <span className="text-sm text-primary-text">{step.description}</span>
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    </div>
    )
}