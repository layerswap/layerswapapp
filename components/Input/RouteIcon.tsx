import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip"
import { CircleAlert, RouteOff } from "lucide-react"

type Props = {
    isAvailable: boolean,
    routeNotFound: boolean,
    direction: string
}

const RouteIcon: FC<Props> = (props) => {
    const { isAvailable, routeNotFound, direction } = props

    if (!isAvailable)
        return <Tooltip delayDuration={200}>
            <TooltipTrigger asChild >
                <div className="absolute -left-1 top-0.5 z-50">
                    <CircleAlert className="!w-4 text-primary-text-placeholder hover:text-primary-text icoooooooooon" />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p className="max-w-72">
                    Transfers {direction} this token are not available at the moment. Please try later.
                </p>
            </TooltipContent>
        </Tooltip>

    if (routeNotFound)
        return <Tooltip delayDuration={200}>
            <TooltipTrigger asChild >
                <div className="absolute -left-0.5 top-0.5 z-50">
                    <RouteOff className="!w-3 text-primary-text-placeholder hover:text-primary-text icoooooooooon" />
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p className="max-w-72">
                    Route unavailable
                </p>
            </TooltipContent>
        </Tooltip>

    return undefined
}

export default RouteIcon