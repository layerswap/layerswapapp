import type { ReactNode } from 'react';
import { WalletExecutionTransition } from './WalletExecutionTransition';
import Steps, { StepsPanel } from '../Processing/StepsComponent';
import type { StatusStep } from '../Processing/types';
import { TransferStatusHeader } from './TransferStatusHeader';

export type ProgressPanelData = {
    title: string;
    description?: ReactNode;
    progress: number;
    completed?: boolean;
    icon?: ReactNode;
    label?: string;
    announcement?: string;
    steps: StatusStep[];
    details?: ReactNode;
};

/** The single surface shared by wallet prompts, processing and receipts. */
export function ProgressPanelView({
    data,
    animateOnMount = false,
}: {
    data: ProgressPanelData | null;
    animateOnMount?: boolean;
}) {
    return (
        <WalletExecutionTransition
            initial={animateOnMount}
            workflow={data ? <ProgressPanelSurface data={data} /> : null}
        />
    );
}

export function ProgressPanelSurface({ data }: { data: ProgressPanelData }) {
    return (
        <StepsPanel label={data.label}>
            <TransferStatusHeader
                title={data.title}
                description={data.description}
                progress={data.progress}
                completed={data.completed}
                icon={data.icon}
            />
            {data.announcement && (
                <p className="sr-only" aria-live="polite" aria-atomic="true">
                    {data.announcement}
                </p>
            )}
            <div className="pt-4">
                {data.steps.length > 0 && <Steps steps={data.steps} />}
                {data.details}
            </div>
        </StepsPanel>
    );
}
