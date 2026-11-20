import { FC, useEffect, useState } from 'react';
import {
    SwapDetails,
    TransactionType,
} from '../../lib/apiClients/layerSwapApiClient';
import { ElapsedTime } from './ElapsedTime';

const CountdownTimer: FC<{
    initialTime: string;
    swapDetails: SwapDetails;
    onThresholdChange?: (threshold: boolean) => void;
}> = ({ initialTime, swapDetails, onThresholdChange }) => {
    const [elapsedTimer, setElapsedTimer] = useState<number>(0);
    const [thresholdElapsed, setThresholdElapsed] = useState<boolean>(false);
    const swapInputTransaction = swapDetails?.transactions?.find(
        (t) => t.type === TransactionType.Input,
    );

    useEffect(() => {
        // Start timer immediately when component renders
        const startTime = swapInputTransaction?.timestamp
            ? new Date(swapInputTransaction.timestamp).getTime()
            : null;
        if (!startTime) return;

        const timer = setInterval(() => {
            const currentTime = new Date();
            const elapsedTime = currentTime.getTime() - startTime;
            setElapsedTimer(Math.max(elapsedTime, 0));

            const newThreshold =
                elapsedTime > 3 * timeStringToMilliseconds(initialTime);
            if (newThreshold !== thresholdElapsed) {
                setThresholdElapsed(newThreshold);
                onThresholdChange?.(newThreshold);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [initialTime, swapDetails.status, swapInputTransaction?.timestamp]);

    return <ElapsedTime swapDetails={swapDetails} elapsedMs={elapsedTimer} />;
};

export default CountdownTimer;

function timeStringToMilliseconds(timeString: string) {
    const parts = timeString.split('.');
    const time = parts[0];
    const [hours, minutes, seconds] = time.split(':').map(parseFloat);
    const milliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000;

    return milliseconds;
}
