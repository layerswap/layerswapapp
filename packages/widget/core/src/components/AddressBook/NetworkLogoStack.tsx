import { FC } from 'react'
import clsx from 'clsx'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import type { ScopeItem } from './useAddressScope'

type Props = {
    /** Networks in scope. Shows up to `max` logos, then a "+N" count badge. */
    items: ScopeItem[]
    /** Optional friendly summary shown in the hover tooltip (e.g. "All EVM networks"). */
    summary?: string
    max?: number
    /** Tailwind bg/border color of the surface behind the stack, for the overlap rings. */
    ringClassName?: string
}

/** How many names to list inside the tooltip before collapsing into "+N more". */
const TOOLTIP_LIST_MAX = 12

const ItemLogo: FC<{ item: ScopeItem, size: number, className?: string }> = ({ item, size, className }) =>
    item.logo
        ? <ImageWithFallback src={item.logo} alt={item.name} width={size} height={size} style={{ width: size, height: size }} className={clsx('object-contain rounded-md', className)} />
        : <span style={{ width: size, height: size }} className={clsx('rounded-md bg-secondary-800', className)} />

const NetworkLogoStack: FC<Props> = ({ items, summary, max = 3, ringClassName = 'border-secondary-500 bg-secondary-500' }) => {
    if (items.length === 0) return null

    const shown = items.slice(0, max)
    const overflow = items.length - shown.length
    const chipClass = clsx('border-2 h-5 w-5', ringClassName)
    const listed = items.slice(0, TOOLTIP_LIST_MAX)
    const listOverflow = items.length - listed.length

    return (
        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <div className="flex items-center shrink-0">
                    {shown.map((item, i) => (
                        <ItemLogo key={item.name} item={item} size={20} className={clsx(chipClass, i > 0 && '-ml-2')} />
                    ))}
                    {overflow > 0 && (
                        <span className={clsx(chipClass, '-ml-2 inline-flex items-center justify-center rounded-md px-1 w-auto min-w-5 text-[10px] font-semibold leading-none text-secondary-text !bg-secondary-600')}>
                            +{overflow}
                        </span>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="max-w-[240px] p-2.5">
                {summary ? (
                    <span className="text-primary-text text-xs font-medium">{summary}</span>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        <div className="px-0.5 text-[11px] font-medium text-secondary-text">
                            {items.length === 1 ? '1 network' : `${items.length} networks`}
                        </div>
                        <div className="flex flex-col gap-1">
                            {listed.map(item => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <ItemLogo item={item} size={16} />
                                    <span className="truncate text-xs text-primary-text">{item.name}</span>
                                </div>
                            ))}
                            {listOverflow > 0 && (
                                <span className="px-0.5 text-[11px] text-secondary-text">+{listOverflow} more</span>
                            )}
                        </div>
                    </div>
                )}
            </TooltipContent>
        </Tooltip>
    )
}

export default NetworkLogoStack
