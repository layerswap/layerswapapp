import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/outline'
import { classNames } from './utils/classNames'
import useCopyClipboard from './utils/useCopyClipboard'
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
          {children}
          <CheckIcon className={iconClassName} width={iconWidth ? iconWidth: 16} height={iconHeight ? iconHeight: 16} />
        </div>
      )}

      {!isCopied && (
        <div className="flex items-center gap-1 cursor-pointer">
          {children}
          <DocumentDuplicateIcon className={iconClassName} width={iconWidth ? iconWidth: 16} height={iconHeight ? iconHeight: 16} />
        </div>
      )}
    </div>
  )
}

export default CopyButton