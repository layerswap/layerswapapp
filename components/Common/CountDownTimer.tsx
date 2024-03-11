import { FC, useCallback, useEffect, useState } from "react";
import { SwapStatus } from "../../Models/SwapStatus";
import { useIntercom } from "react-use-intercom";
import { useAuthState } from "../../context/authContext";
import { SwapItem, TransactionType } from "../../lib/layerSwapApiClient";
import { datadogRum } from "@datadog/browser-rum";

const CountdownTimer: FC<{ initialTime: string, swap: SwapItem }> = ({ initialTime, swap }) => {
    const { email, userId } = useAuthState();
    const { boot, show, update } = useIntercom();
    const [countdown, setCountdown] = useState<string>("");
    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input)

    useEffect(() => {
        const targetTime = new Date(swapInputTransaction?.timestamp!);
        const avgCompletionTime = parseTime(initialTime);
        targetTime.setSeconds(targetTime.getSeconds() + avgCompletionTime);

        const timer = setInterval(() => {
            const currentTime = new Date();
            const remainingTime = Math.max(targetTime.getTime() - currentTime.getTime(), 0);
            const formattedTime = formatTime(remainingTime);
            setCountdown(formattedTime);
        }, 1000);

        return () => clearInterval(timer);
    }, [initialTime, swap.status]);

    const updateWithProps = () => update({ email: email, userId: userId, customAttributes: { swapId: swap?.id } });
    const startIntercom = useCallback(() => {
        boot();
        show();
        updateWithProps();
    }, [boot, show, updateWithProps]);

    const parseTime = (timeString: string): number => {
        const [hours, minutes, seconds] = timeString.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    };

    const formatTime = (milliseconds: number): string => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    if (countdown === "00:00:00" && swap.status !== SwapStatus.Completed) {
        const renderingError = new Error("Transaction is taking longer than expected");
        renderingError.name = `LongTransactionError`;
        renderingError.cause = renderingError;
        datadogRum.addError(renderingError);
    }

    return (
        <div className='flex items-center space-x-1'>
            {countdown === "00:00:00" && swap.status !== SwapStatus.Completed ?
                <div>
                    <div><span>Transaction is taking longer than expected</span> <a className='underline hover:cursor-pointer' onClick={() => startIntercom()}> please contact our support.</a></div>
                </div>
                :
                swap.status === SwapStatus.Completed && (!countdown || countdown === "00:00:00") ?
                    ""
                    :
                    <div className='text-secondary-text'><span>Time remaining:</span> <span className='text-primary-text'>{countdown}</span></div>
            }
        </div>

    );
};

export default CountdownTimer;