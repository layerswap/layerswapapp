import { FC } from "react";

type AverageCompletionTimeProps = {
    time: string | undefined
}

const AverageCompletionTime: FC<AverageCompletionTimeProps> = ({ time }) => {
    
    if (!time) {
        return <span>~1-2 minutes</span>
    }

    const parts = time?.split(":");
    const averageTimeInMinutes = parts && parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + parseInt(parts[2]) / 60

    const hours = Math.floor(averageTimeInMinutes / 60);
    const minutes = averageTimeInMinutes % 60;

    if (averageTimeInMinutes > 1 && averageTimeInMinutes < 60) return <span>~{averageTimeInMinutes.toFixed()} minutes</span>
    else if (averageTimeInMinutes >= 60) return <span><span>~</span>{hours} <span>{hours > 1 ? 'hours' : 'hour'}</span> <span>{minutes > 0 ? ` ${minutes?.toFixed()} minutes` : ''}</span></span>
    else return <span>~1-2 minutes</span>
}

export default AverageCompletionTime