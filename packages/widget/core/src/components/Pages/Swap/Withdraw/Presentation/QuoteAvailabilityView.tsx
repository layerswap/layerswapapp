import type { ReactNode } from 'react';
import { RouteOff } from 'lucide-react';
import { ErrorDisplay } from '../../Form/SecondaryComponents/validationError/ErrorDisplay';
import { ICON_CLASSES_WARNING } from '../../Form/SecondaryComponents/validationError/constants';
export function QuoteAvailabilityView({
    error,
    available,
    children,
}: {
    error?: boolean;
    available: boolean;
    children?: ReactNode;
}) {
    if (error)
        return (
            <ErrorDisplay
                icon={<RouteOff className={ICON_CLASSES_WARNING} />}
                title="Unable to retrieve quote"
                message="Unable to retrieve quote"
            />
        );
    if (!available)
        return (
            <div
                aria-label="Loading quote"
                className="h-[150px] w-full rounded-xl bg-secondary-500 animate-pulse"
            />
        );
    return <>{children}</>;
}
