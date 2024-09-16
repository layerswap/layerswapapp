import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip"
import { CircleAlert, RouteOff } from "lucide-react"

type Props = {
    isAvailable: boolean,
    routeNotFound: boolean,
    direction: string
}

const ResolveRouteIcon = (props:Props) => {
    const { isAvailable, routeNotFound, direction } = props

    if (!isAvailable)
        return <Tooltip delayDuration={200}>
            <TooltipTrigger asChild >
                <div className="absolute top-0.5 z-50 inset-0 flex items-center cursor-pointer">
                    <CircleAlert className="!w-3.5 text-primary-text-placeholder hover:text-primary-text" />
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">
                <p className="max-w-72  p-2 text-base text-primary-text">
                    Transfers {direction} this token are not available at the moment. Please try later.
                </p>
            </TooltipContent>
        </Tooltip>

    if (routeNotFound)
        return <Tooltip delayDuration={200}>
            <TooltipTrigger asChild >
                <div className="absolute top-0.5 z-50 inset-0 flex items-center cursor-pointer">
                    <RouteOff className="!w-3 text-primary-text-placeholder hover:text-primary-text" />
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">
                <p className="max-w-72 py-1.5 text-base text-primary-text">
                    Route unavailable
                </p>
            </TooltipContent>
        </Tooltip>

    return undefined
}

export default ResolveRouteIcon