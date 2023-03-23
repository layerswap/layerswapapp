import { Check, Copy } from 'lucide-react'
import { classNames } from '../utils/classNames'
import useCopyClipboard from '../../hooks/useCopyClipboard'
import React, { FC } from 'react'

interface CopyButtonProps {
  className?: string
  toCopy: string | number
  children?: React.ReactNode
  iconHeight?: number
  iconWidth?: number
  iconClassName?: string
}

const CopyButton: FC<CopyButtonProps> = ({ className, toCopy, children, iconHeight, iconWidth, iconClassName }) => {
  const [isCopied, setCopied] = useCopyClipboard()

  return (
    <div className={classNames(className)} onClick={() => setCopied(toCopy)}>
      {isCopied && (
        <div className="flex items-center gap-1 cursor-pointer">
          <Check className={iconClassName} width={iconWidth ? iconWidth : 16} height={iconHeight ? iconHeight : 16} />
          {children}
        </div>
      )}

      {!isCopied && (
        <div className="flex items-center gap-1 cursor-pointer">
          <Copy className={iconClassName} width={iconWidth ? iconWidth : 16} height={iconHeight ? iconHeight : 16} />
          {children}
        </div>
      )}
    </div>
  )
}

export default CopyButton