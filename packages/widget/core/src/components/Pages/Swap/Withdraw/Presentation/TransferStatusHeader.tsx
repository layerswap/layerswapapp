import type { ReactNode } from 'react';
import { Gauge } from '../Processing/gauge';

export function TransferStatusHeader({
    title,
    description,
    progress,
    completed = false,
    icon,
}: {
    title: string;
    description?: ReactNode;
    progress: number;
    completed?: boolean;
    icon?: ReactNode;
}) {
    return (
        <div className="flex items-center gap-2.5 border-b-2 border-dashed border-secondary-300 pb-4">
            {icon ? (
                <div className="shrink-0">{icon}</div>
            ) : (
                <div
                    className="shrink-0"
                    role="progressbar"
                    aria-label="Transfer progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                >
                    <Gauge
                        value={progress}
                        size="verySmall"
                        showCheckmark={completed}
                    />
                </div>
            )}
            <h3 className="min-w-0 flex-1 text-sm font-medium text-primary-text">
                {title}
            </h3>
            {description && (
                <div className="max-w-[45%] text-right text-xs text-secondary-text">
                    {description}
                </div>
            )}
        </div>
    );
}
