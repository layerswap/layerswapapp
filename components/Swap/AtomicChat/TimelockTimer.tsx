import { useCallback, useEffect, useState } from "react"
import { useInterval } from "../../../hooks/useInterval"
import ClickTooltip from "../../Tooltips/ClickTooltip"

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
        <div className="w-full flex justify-end text-secondary-text">
            <div className="py-1 px-2 border-2 border-secondary-500 rounded-componentRoundness bg-secondary-700 w-fit text-sm">
                <div className="flex items-center gap-1.5">
                    <p className="w-8">{twoDigits(minutesToDisplay)}:{twoDigits(secondsToDisplay)}</p>
                    <ClickTooltip text={`If the swap is not completed before the timelock expires, you can always refund your funds.`} />
                </div>
            </div>
        </div>
    )
}

export default TimelockTimer