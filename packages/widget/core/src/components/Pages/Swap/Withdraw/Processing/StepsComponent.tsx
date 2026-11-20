import type { ReactNode } from 'react';
import Step from './Step';
import type { StatusStep } from './types';

export function StepsPanel({
    children,
    label,
}: {
    children: ReactNode;
    label?: string;
}) {
    return (
        <section
            aria-label={label}
            data-steps-panel
            className="w-full overflow-hidden rounded-2xl bg-secondary-500 font-normal"
        >
            <div className="px-3 py-4">{children}</div>
        </section>
    );
}

export default function Steps({ steps }: { steps: StatusStep[] }) {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="space-y-1">
                {steps.map((step) => (
                    <Step key={step.id} step={step} />
                ))}
            </ol>
        </nav>
    );
}
