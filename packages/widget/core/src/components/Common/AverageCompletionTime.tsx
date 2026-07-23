import { FC } from "react";
import { formatVerboseHms, parseHmsString } from "@/components/utils/formatTime";

type AverageCompletionTimeProps = {
    avgCompletionTime: string | undefined
    className?: string
}

const AverageCompletionTime: FC<AverageCompletionTimeProps> = ({ avgCompletionTime, className }) => {
    const parts = parseHmsString(avgCompletionTime);
    if (!parts) return;

    return <p className={className}>{formatVerboseHms(parts)}</p>
}

export default AverageCompletionTime