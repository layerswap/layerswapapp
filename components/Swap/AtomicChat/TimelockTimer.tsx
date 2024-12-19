import { useCallback, useEffect, useState } from "react"
import { useInterval } from "../../../hooks/useInterval"
import { Tooltip, TooltipContent, TooltipTrigger } from "../../shadcn/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "../../shadcn/popover"
import { HelpCircle } from "lucide-react"

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
        <Popover>
            <PopoverTrigger>
                <div className="px-2 py-0.5 rounded-md bg-secondary-700 text-sm text-secondary-text w-max">
                    <div className="flex items-center gap-1.5">
                        <p>Refund</p>
                        <HelpCircle className="h-4 w-4" />
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent side="top" className="max-w-[300px] !border-0 !bg-secondary-600 p-3 space-y-1 !rounded-lg">
                <p className="text-sm text-primary-text">
                    <span>Refund available in</span> <span className="w-9">{twoDigits(minutesToDisplay)}:{twoDigits(secondsToDisplay)}</span>
                </p>
                <p className="text-xs">If the swap is not completed before the timelock expires, you can always refund</p>
            </PopoverContent>
        </Popover>
    )
}

export default TimelockTimer