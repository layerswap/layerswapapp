import { FC, useEffect, useState } from "react";
import { SwapStatus } from "../../Models/SwapStatus";
import { SwapDetails, TransactionType } from "../../lib/apiClients/layerSwapApiClient";
import posthog from "posthog-js";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";

const CountdownTimer: FC<{ initialTime: string, swapDetails: SwapDetails, onThresholdChange?: (threshold: boolean) => void }> = ({ initialTime, swapDetails, onThresholdChange }) => {
    const [elapsedTimer, setElapsedTimer] = useState<number>(0);
    const { swapTransactions } = useSwapTransactionStore()
    const [thresholdElapsed, setThresholdElapsed] = useState<boolean>(false);
    const swapInputTransaction = swapDetails?.transactions?.find(t => t.type === TransactionType.Input)
    const storedWalletTransaction = swapTransactions?.[swapDetails?.id]

    useEffect(() => {
        // Start timer immediately when component renders
        const startTime = swapInputTransaction?.timestamp ? new Date(swapInputTransaction.timestamp).getTime() : storedWalletTransaction?.timestamp ? new Date(storedWalletTransaction.timestamp).getTime() : Date.now();

        const timer = setInterval(() => {
            const currentTime = new Date();
            const elapsedTime = currentTime.getTime() - startTime;
            setElapsedTimer(Math.max(elapsedTime, 0));

            const newThreshold = elapsedTime > 3 * timeStringToMilliseconds(initialTime);
            if (newThreshold !== thresholdElapsed) {
                setThresholdElapsed(newThreshold);
                onThresholdChange?.(newThreshold);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [initialTime, swapDetails.status]);

    const formatTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const formattedHours = hours > 0 ? String(hours).padStart(2, '0') + ":" : ''
        const formattedMinutes = String(minutes).padStart(2, '0')
        const formattedSeconds = String(seconds).padStart(2, '0')

        return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
    };
    const formatted = formatTime(elapsedTimer);

    return (
        <div className='flex items-center justify-center space-x-1'>
            {
                swapDetails.status === SwapStatus.Completed ? (
                    ""
                ) : (
                    <div className='text-secondary-text flex items-center'>
                        <span>Elapsed time:</span>
                        <span className='text-primary-text ml-0.5'>
                            {formatted}
                        </span>
                    </div>
                )
            }
        </div>

    );
};

export default CountdownTimer;

function timeStringToMilliseconds(timeString) {
    const parts = timeString.split('.');
    const time = parts[0];
    const [hours, minutes, seconds] = time.split(':').map(parseFloat);
    const milliseconds = ((hours * 3600) + (minutes * 60) + seconds) * 1000;

    return milliseconds;
}
