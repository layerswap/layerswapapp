import { Check, Copy } from 'lucide-react'
import { classNames } from '../utils/classNames'
import useCopyClipboard from '../../hooks/useCopyClipboard'
import React, { FC } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shadcn/tooltip'

interface CopyButtonProps {
  className?: string
  toCopy: string | number
  children?: React.ReactNode
  iconSize?: number
  iconClassName?: string
}

const CopyButton: FC<CopyButtonProps> = ({ className, toCopy, children, iconSize, iconClassName }) => {
  const [isCopied, setCopied] = useCopyClipboard()

  return (
      <Tooltip>
        <TooltipTrigger>
          <div className={classNames(className)} onClick={() => setCopied(toCopy)}>
            {isCopied && (
              <div className="flex items-center gap-1 cursor-pointer">
                <Check className={iconClassName} width={iconSize ? iconSize : 16} height={iconSize ? iconSize : 16} />
                {children}
              </div>
            )}

            {!isCopied && (
              <div className="flex items-center gap-1 cursor-pointer">
                <Copy className={iconClassName} width={iconSize ? iconSize : 16} height={iconSize ? iconSize : 16} />
                {children}
              </div>
            )}
          </div>
        </TooltipTrigger>
          <TooltipContent>
            <p>Copy</p>
          </TooltipContent>
      </Tooltip>
  )
}

export default CopyButton