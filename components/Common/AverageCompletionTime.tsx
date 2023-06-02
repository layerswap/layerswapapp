import { FC } from "react";
import { CryptoNetwork } from "../../Models/CryptoNetwork";

type AverageCompletionTimeProps = {
    destinationNetwork: CryptoNetwork
}

const AverageCompletionTime: FC<AverageCompletionTimeProps> = ({ destinationNetwork }) => {

    const averageTimeString = destinationNetwork?.average_completion_time
        || ''

    const parts = averageTimeString?.split(":");
    const averageTimeInMinutes = parts && parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + parseInt(parts[2]) / 60
    if (averageTimeInMinutes > 1) return <span>~{averageTimeInMinutes.toFixed()} minutes</span>
    else if (averageTimeInMinutes >= 60) return <span>~1 hour</span>
    else return <span>~1-2 minutes</span>
}

export default AverageCompletionTime