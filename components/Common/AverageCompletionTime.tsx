import { FC } from "react";

type AverageCompletionTimeProps = {
    avgCompletionTime: string | undefined
}

const AverageCompletionTime: FC<AverageCompletionTimeProps> = ({ avgCompletionTime }) => {
    
    if (!avgCompletionTime) return

    const a = avgCompletionTime?.split(':');
    const seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
    const minutes = seconds / 60
    const hours = seconds / 3600

    if (minutes && minutes > 1 && minutes < 60) return <span><span>~</span><span>{minutes.toFixed()}</span> <span>minutes</span></span>
    else if (minutes && minutes >= 60) return <span><span>~</span><span>{hours}</span> <span>{hours && hours > 1 ? 'hours' : 'hour'}</span> <span>{minutes > 0 ? ` ${minutes?.toFixed()} minutes` : ''}</span></span>
    else if (seconds && seconds <= 60) return <span><span>~</span><span>{seconds.toFixed()}</span> <span>seconds</span></span>
    else return <span>~1-2 minutes</span>
}

export default AverageCompletionTime