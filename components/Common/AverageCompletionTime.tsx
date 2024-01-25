import { FC } from "react";

type AverageCompletionTimeProps = {
    minutes: number | undefined,
    hours: number | undefined,
    seconds: number | undefined
}

const AverageCompletionTime: FC<AverageCompletionTimeProps> = ({ minutes, hours, seconds }) => {
    if (minutes && minutes > 1 && minutes < 60) return <span><span>~</span><span>{minutes.toFixed()}</span> <span>minutes</span></span>
    else if (minutes && minutes >= 60) return <span><span>~</span><span>{hours}</span> <span>{hours && hours > 1 ? 'hours' : 'hour'}</span> <span>{minutes > 0 ? ` ${minutes?.toFixed()} minutes` : ''}</span></span>
    else if (seconds && seconds <= 60) return <span><span>~</span><span>{seconds.toFixed()}</span> <span>seconds</span></span>
    else return <span>~1-2 minutes</span>
}

export default AverageCompletionTime