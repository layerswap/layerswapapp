import { FC } from "react";
import { formatHmsClock, parseHmsString } from "@/components/utils/formatTime";

type AverageCompletionTimeProps = {
    avgCompletionTime: string | undefined
}

const FormattedAverageCompletionTime: FC<AverageCompletionTimeProps> = ({ avgCompletionTime }) => {
    const parts = parseHmsString(avgCompletionTime);
    if (!parts) return;

    return <span>{formatHmsClock(parts)}</span>
}

export default FormattedAverageCompletionTime