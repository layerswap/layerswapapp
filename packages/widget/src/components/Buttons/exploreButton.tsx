import {  ExternalLink } from 'lucide-react'
import { classNames } from '../utils/classNames'
import React, { AnchorHTMLAttributes, FC, forwardRef } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shadcn/tooltip'

interface ExploreButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string
  children?: React.ReactNode
  iconSize?: number
  iconClassName?: string
}

const ExploreButton: FC<ExploreButtonProps> = forwardRef<HTMLAnchorElement, ExploreButtonProps>(function co({ className, children, iconSize, iconClassName, ...rest }, ref) {

  return (
      <Tooltip>
        <TooltipTrigger>
          <div className={classNames(className)}>
              <a {...rest} className="flex items-center gap-1 cursor-pointer">
                <ExternalLink className={iconClassName} width={iconSize ? iconSize : 16} height={iconSize ? iconSize : 16} />
                {children}
              </a>
          </div>
        </TooltipTrigger>
          <TooltipContent>
            <p>View in explorer</p>
          </TooltipContent>
      </Tooltip>
  );
})

export default ExploreButton