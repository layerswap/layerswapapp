import { FC } from "react";

type AverageCompletionTimeProps = {
    avgCompletionTime: string | undefined
}

const FormattedAverageCompletionTime: FC<AverageCompletionTimeProps> = ({ avgCompletionTime }) => {

    if (!avgCompletionTime) return

    const parts = avgCompletionTime.split('.');
    const time = parts[0];
    const [hours, minutes, seconds] = time.split(':').map(parseFloat);
    
    const formattedHours = hours>0 ? String(hours).padStart(2, '0') + ":" : ''
    const formattedMinutes = String(minutes).padStart(2, '0')
    const formattedSeconds = String(seconds).padStart(2, '0')

    const fullFormatted = `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
    return <span>
        {fullFormatted}
    </span>
}

export default FormattedAverageCompletionTime