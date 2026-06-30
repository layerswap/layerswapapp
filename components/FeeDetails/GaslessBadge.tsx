import { FC } from 'react'
import clsx from 'clsx'
import GasIcon from '../icons/GasIcon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shadcn/tooltip'

// Green pill shown in place of the gas fee when the route is gasless. Carries its own tooltip
// so the explanation shows wherever the badge is used.
const GaslessBadge: FC<{ className?: string }> = ({ className }) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full bg-success-foreground/15 pl-2 pr-3 py-1",
                    className,
                )}>
                    <GasIcon className="h-4 w-4 text-success-foreground" />
                    <span className="text-success-foreground font-bold text-sm leading-none">Gasless</span>
                </div>
            </TooltipTrigger>
            <TooltipContent className="bg-secondary-300! border-secondary-300! text-primary-text! max-w-52">
                <span>You don’t need to have the network’s native token to pay for gas, it’s covered for you</span>
            </TooltipContent>
        </Tooltip>
    )
}

export default GaslessBadge
