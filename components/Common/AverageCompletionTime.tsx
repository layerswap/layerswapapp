import { FC } from "react";

type AverageCompletionTimeProps = {
    avgCompletionTime: string | undefined
}

const AverageCompletionTime: FC<AverageCompletionTimeProps> = ({ avgCompletionTime }) => {

    if (!avgCompletionTime) return

    const time = avgCompletionTime?.split(':');
    const hours = Number(time[0])
    const minutes = Number(time[1])
    const seconds = Number(time[2])

    return <p>{hours > 0 ? `${hours.toFixed()} ${(hours > 1 ? 'hours' : 'hour')}` : ''} {minutes > 0 ? `${minutes.toFixed()} ${(minutes > 1 ? 'minutes' : 'minute')}` : ''} {(seconds > 0 && minutes == 0 && hours == 0) ? `${seconds.toFixed()} seconds` : ''}</p>
}

export default AverageCompletionTime