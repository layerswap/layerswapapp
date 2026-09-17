import { FC } from "react";
import { formatVerboseHms, parseHmsString } from "@/components/utils/formatTime";
import { resolveRouteSpeed, routeSpeedTextClass } from "@/lib/routeSpeed";
import { cn } from "@/components/utils/cn";

type AverageCompletionTimeProps = {
    avgCompletionTime: string | undefined
    className?: string
}

/** Renders the verbose estimate; slow routes are yellow and very slow routes red (see `routeSpeed.ts`). */
const AverageCompletionTime: FC<AverageCompletionTimeProps> = ({ avgCompletionTime, className }) => {
    const parts = parseHmsString(avgCompletionTime);
    if (!parts) return;

    const speed = resolveRouteSpeed(avgCompletionTime);
    return <p className={cn(className, routeSpeedTextClass(speed, ''))}>{formatVerboseHms(parts)}</p>
}

export default AverageCompletionTime
