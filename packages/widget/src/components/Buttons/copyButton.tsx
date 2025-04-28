'use client'

import { Check, Copy } from 'lucide-react'
import { classNames } from '../utils/classNames'
import React, { FC, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shadcn/tooltip'
import { useCopyToClipboard } from '@uidotdev/usehooks'

interface CopyButtonProps {
  className?: string
  toCopy: string | number
  children?: React.ReactNode
  iconSize?: number
  iconClassName?: string
}

const CopyButton: FC<CopyButtonProps> = ({ className, toCopy, children, iconSize, iconClassName }) => {
  const [isCopied, setCopied] = useCopyToClipboard()
  const [isTooltipOpen, setTooltipOpen] = useState(false);
  const handleCopyClick = () => {
    setCopied(toCopy.toString());
    setTooltipOpen(true);
  };

  return (
    <Tooltip open={isTooltipOpen} onOpenChange={setTooltipOpen}>
      <TooltipTrigger>
        <div className={classNames(className)} onClick={handleCopyClick}>
          {isCopied ? (
            <div className="flex items-center gap-1 cursor-pointer">
              <Check className={iconClassName} width={iconSize ? iconSize : 16} height={iconSize ? iconSize : 16} />
              {children}
            </div>
          ) : (
            <div className="flex items-center gap-1 cursor-pointer">
              <Copy className={iconClassName} width={iconSize ? iconSize : 16} height={iconSize ? iconSize : 16} />
              {children}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isCopied ? "Copied" : "Copy"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default CopyButton