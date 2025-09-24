import React, { createContext, useContext, FC, ReactNode, useState, SVGProps } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import useWindowDimensions from '@/hooks/useWindowDimensions'
import NetworkTabIcon from '@/components/icons/NetworkTabIcon'
import ExchangeTabIcon from '@/components/icons/ExchangeTabIcon'

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
    const hoveredOnDesktop = isDesktop && hovered
    return (
        <div className="relative">
            <motion.div
                onHoverStart={() => setHovered(true)}
                onHoverEnd={() => setHovered(false)}
                animate={{ width: hoveredOnDesktop ? 180 : 48 }}
                className="sm:absolute right-full top-24 overflow-hidden rounded-l-xl max-sm:right-19 max-sm:z-20 max-sm:top-[9px] max-sm:w-fit! max-sm:rounded-lg"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            >
                <div className="flex flex-col bg-secondary-500 h-full p-1.5 sm:p-2 w-full space-y-2 max-sm:flex-row max-sm:space-y-0 max-sm:space-x-2">
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
                'w-full flex items-center justify-start !p-1 hover:bg-secondary-100 text-secondary-text hover:text-primary-text overflow-hidden rounded-md max-sm:justify-center max-sm:px-0 gap-1.5',
                { 'bg-secondary-300 !text-primary-text': isActive }
            )}
        >
            <div className="h-6 w-6 max-sm:h-5 max-sm:w-5">
                <Icon className='h-6 w-6 max-sm:h-5 max-sm:w-5' />
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
            <div className="transition-all duration-200">
                {children}
            </div>
        )}
    </>
}

export const NetworkExchangeTabs = () => {
    return <Tabs defaultValue="cross-chain">
        <TabsList>
            <TabsTrigger label="Swap" Icon={NetworkTabIcon} value="cross-chain" />
            <TabsTrigger label="Deposit from CEX" Icon={ExchangeTabIcon} value="exchange" />
        </TabsList>
    </Tabs>
}