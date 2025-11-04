import React, { createContext, useContext, FC, ReactNode, useState, SVGProps } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import useWindowDimensions from '@/hooks/useWindowDimensions'
import NetworkTabIcon from '@/components/Icons/NetworkTabIcon'
import ExchangeTabIcon from '@/components/Icons/ExchangeTabIcon'
import AppSettings from '@/lib/AppSettings'

interface TabsContextType {
    activeId: string
    setActiveId: (id: string) => void
}
const TabsContext = createContext<TabsContextType | undefined>(undefined)

interface TabsProps {
    defaultValue: string
    children: ReactNode
}
export const Tabs: FC<TabsProps> = ({ defaultValue, children }) => {
    const [activeId, setActiveId] = useState(defaultValue)
    return (
        <TabsContext.Provider value={{ activeId, setActiveId }}>
            {children}
        </TabsContext.Provider>
    )
}

interface TabsListProps { children: ReactNode }
export const TabsList: FC<TabsListProps> = ({ children }) => {
    const { isDesktop } = useWindowDimensions()
    const [hovered, setHovered] = useState(false)
    const hoveredOnDesktop = isDesktop && hovered && AppSettings.ThemeData?.enableWideVersion == true
    return (
        <div className="relative">
            <motion.div
                onHoverStart={() => setHovered(true)}
                onHoverEnd={() => setHovered(false)}
                animate={{ width: AppSettings.ThemeData?.enableWideVersion == true ? hoveredOnDesktop ? 180 : isDesktop ? 48 : 'auto' : 'auto' }}
                className={clsx("overflow-hidden rounded-lg", { 'sm:!absolute sm:!rounded-l-xl sm:!rounded-r-none sm:!top-24 sm:!right-full': AppSettings.ThemeData?.enableWideVersion == true })}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            >
                <div className={clsx("bg-secondary-500 h-full p-1.5 w-full flex flex-row space-y-0 space-x-2",
                    { 'sm:!flex-col sm:!p-2 sm:!space-y-2 sm:!space-x-0': AppSettings.ThemeData?.enableWideVersion == true })
                }>
                    {React.Children.map(children, child =>
                        React.isValidElement(child)
                            ? React.cloneElement(child as React.ReactElement<TabsTriggerProps>, { isHovered: hoveredOnDesktop })
                            : child
                    )}
                </div>
            </motion.div>
        </div>
    )
}
interface TabsTriggerProps {
    value: string
    Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
    label: string
    isHovered?: boolean
}
export const TabsTrigger: FC<TabsTriggerProps> = ({ value, isHovered, label, Icon }) => {
    const ctx = useContext(TabsContext)
    if (!ctx) throw new Error('TabsTrigger must be used within <Tabs>')
    const isActive = ctx.activeId === value
    return (
        <button
            type="button"
            onClick={() => ctx.setActiveId(value)}
            className={clsx(
                'w-full flex items-center justify-start max-sm:!p-1 sm:p-1 hover:bg-secondary-100 text-secondary-text hover:text-primary-text overflow-hidden rounded-md max-sm:justify-center max-sm:px-0 gap-1.5',
                {
                    'bg-secondary-300 !text-primary-text': isActive,
                    'sm:!p-0.5': AppSettings.ThemeData?.enableWideVersion == false
                }
            )}
        >
            <div className={clsx("h-5 w-5", { 'sm:!h-6 sm:!w-6': AppSettings.ThemeData?.enableWideVersion == true })}>
                <Icon className={clsx('h-5 w-5', { 'sm:!h-6 sm:!w-6': AppSettings.ThemeData?.enableWideVersion == true })} />
            </div>
            {isHovered && <span className="text-sm whitespace-nowrap">{label}</span>}
        </button>

    )
}

interface TabsContentProps { value: string; children: ReactNode }
export const TabsContent: FC<TabsContentProps> = ({ value, children }) => {
    const ctx = useContext(TabsContext)
    if (!ctx) throw new Error('TabsContent must be used within <Tabs>')
    return <>
        {value === ctx.activeId && (
            <>{ children }</>
        )}
    </>
}

export const NetworkExchangeTabs = () => {
    return <TabsList>
        <TabsTrigger label="Swap" Icon={NetworkTabIcon} value="cross-chain" />
        <TabsTrigger label="Deposit from CEX" Icon={ExchangeTabIcon} value="exchange" />
    </TabsList>
}