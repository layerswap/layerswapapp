"use client"
import { Check } from 'lucide-react'
import { classNames } from '../utils/classNames'
import useCopyClipboard from '../../hooks/useCopyClipboard'
import React, { FC, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../shadcn/tooltip'
import CopyIcon from '../Icons/CopyIcon'

interface CopyButtonProps {
  className?: string
  toCopy: string | number
  children?: React.ReactNode
  iconSize?: number
  iconClassName?: string
}

const CopyButton: FC<CopyButtonProps & { disabled?: boolean }> = ({
  className,
  toCopy,
  children,
  iconSize,
  iconClassName,
  disabled = false,
}) => {
  const [isCopied, setCopied] = useCopyClipboard()
  const [isTooltipOpen, setTooltipOpen] = useState(false);

  const handleCopyClick = () => {
    if (disabled) return;
    setCopied(toCopy);
    setTooltipOpen(true);
  };

  return (
    <Tooltip open={isTooltipOpen} onOpenChange={setTooltipOpen}>
      <TooltipTrigger>
        <div
          className={classNames(
            className,
            "flex items-center gap-1",
            "cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
          onClick={handleCopyClick}
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
        >
          {isCopied ? (
            <>
              <Check
                className={iconClassName}
                width={iconSize ? iconSize : 16}
                height={iconSize ? iconSize : 16}
              />
              {children}
            </>
          ) : (
            <>
              <CopyIcon
                className={iconClassName}
                width={iconSize ? iconSize : 16}
                height={iconSize ? iconSize : 16}
              />
              {children}
            </>
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