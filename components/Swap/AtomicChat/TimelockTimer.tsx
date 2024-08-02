import { useCallback, useEffect, useState } from "react"
import { useInterval } from "../../../hooks/useInterval"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../shadcn/tooltip"

const TimelockTimer = ({ timelock }: { timelock: number }) => {
    const [secondsRemaining, setSecondsRemaining] = useState<number>()
    const [started, setStarted] = useState(false)

    const start = (seconds: number) => {
        setSecondsRemaining(seconds)
        setStarted(true)
    }

    useEffect(() => {
        if (timelock) {
            start(timelock)
        }
    }, [timelock])

    const callback = useCallback(() => {
        if (Number(secondsRemaining) > 0) {
            if (secondsRemaining == 1) {
                setStarted(false)
            }
            setSecondsRemaining(Number(secondsRemaining) - 1)

        }
    }, [secondsRemaining])

    useInterval(
        callback,
        started ? 1000 : null,
    )

    const twoDigits = (num: number) => String(num).padStart(2, '0')

    const secondsToDisplay = Number(secondsRemaining?.toFixed()) % 60
    const minutesRemaining = (Number(secondsRemaining) - secondsToDisplay) / 60
    const minutesToDisplay = Number(minutesRemaining.toFixed()) % 60

    return (
        started &&

        <Tooltip>
            <TooltipTrigger>
                <div className="px-2 py-0.5 rounded-md bg-secondary-700 text-sm text-secondary-text w-max">
                    <div className="flex items-center gap-1.5">
                        <p>Refund in</p>
                        <p className="w-9">{twoDigits(minutesToDisplay)}:{twoDigits(secondsToDisplay)}</p>
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
                <p className="text-sm">If the swap is not completed before the timelock expires, you can always refund.</p>
            </TooltipContent>
        </Tooltip>

    )
}

export default TimelockTimer