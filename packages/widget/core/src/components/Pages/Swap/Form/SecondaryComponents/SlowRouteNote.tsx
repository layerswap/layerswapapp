import { FC } from "react"
import Clock from "@/components/Icons/Clock"
import { formatVerboseHms, parseHmsString } from "@/components/utils/formatTime"

type Props = {
    avgCompletionTime: string | undefined
}

/** Body of the confirmation shown before starting a swap on a very slow route (see `routeSpeed.ts`). */
const SlowRouteNote: FC<Props> = ({ avgCompletionTime }) => {
    const parts = parseHmsString(avgCompletionTime)
    const estimate = parts ? formatVerboseHms(parts) : undefined

    return (
        <div className="flex flex-col items-center gap-4 mt-2 w-full">
            <div className="h-24 w-24 rounded-2xl bg-error-background flex items-center justify-center">
                <Clock className="h-12 w-12 text-error-foreground" />
            </div>
            <div className="text-center max-w-xs space-y-1">
                <p className="text-2xl">Longer transfer time</p>
                <p className="text-secondary-text">
                    <span>This route takes </span>
                    {estimate ? <><span>approximately </span><span className="text-error-foreground">{estimate}</span></> : <span>longer than usual</span>}
                    <span> to complete. Actual timing may vary depending on network conditions.</span>
                </p>
            </div>
        </div>
    )
}

export default SlowRouteNote
