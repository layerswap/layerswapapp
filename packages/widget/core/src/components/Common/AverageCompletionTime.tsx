import { FC } from "react";
import { formatVerboseHms, parseHmsString } from "@/components/utils/formatTime";
import { isSlowRoute } from "@/lib/routeSpeed";
import { cn } from "@/components/utils/cn";

type AverageCompletionTimeProps = {
    avgCompletionTime: string | undefined
    className?: string
}

/** Renders the verbose estimate; slow routes (see `routeSpeed.ts`) are shown in the warning color. */
const AverageCompletionTime: FC<AverageCompletionTimeProps> = ({ avgCompletionTime, className }) => {
    const parts = parseHmsString(avgCompletionTime);
    if (!parts) return;

    return <p className={cn(className, { "text-warning-foreground": isSlowRoute(avgCompletionTime) })}>{formatVerboseHms(parts)}</p>
}

export default AverageCompletionTime
