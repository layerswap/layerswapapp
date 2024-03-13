import { FC } from "react";

type AverageCompletionTimeProps = {
    avgCompletionTime: string | undefined
}

const FormattedAverageCompletionTime: FC<AverageCompletionTimeProps> = ({ avgCompletionTime }) => {

    if (!avgCompletionTime) return

    const time = avgCompletionTime?.split(':');
    const hours = Number(time[0])
    const minutes = Number(time[1])
    const seconds = Number(time[2])?.toFixed()

    return <p>
        <span>
            {hours > 0 && hours <= 9 ? `0${hours.toFixed()}:` : hours > 9 ? `${hours.toFixed()}:` : ''}
        </span>
        <span>
            {minutes > 0 && minutes <= 9 ? `0${minutes.toFixed()}:` : minutes > 9 ? `${minutes.toFixed()}:` : ''}
        </span>
        <span>
            <span>{hours === 0 && minutes === 0 && Number(seconds) > 0 ? '00:' : ''}</span>
            <span>{Number(seconds) > 0 && Number(seconds) <= 9 ? `0${seconds}` : Number(seconds) > 9 ? `${seconds}` : ''}</span>
        </span>
    </p>
}

export default FormattedAverageCompletionTime