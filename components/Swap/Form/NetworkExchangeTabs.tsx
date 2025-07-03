import React, { createContext, useContext, FC, ReactNode, useState, SVGProps } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

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
    const [hovered, setHovered] = useState(false)
    return (
        <div className="relative">
            <motion.div
                onHoverStart={() => setHovered(true)}
                onHoverEnd={() => setHovered(false)}
                animate={{ width: hovered ? 180 : 48 }}
                className="absolute right-full top-24 overflow-hidden rounded-l-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            >
                <div className="flex flex-col bg-secondary-500 h-full p-2 space-y-2">
                    {React.Children.map(children, child =>
                        React.isValidElement(child)
                            ? React.cloneElement(child as React.ReactElement<TabsTriggerProps>, { isHovered: hovered })
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
                'w-full text-primary-text flex items-center justify-start p-1 hover:bg-secondary-100 overflow-hidden rounded-lg',
                { 'bg-secondary-300': isActive }
            )}
        >
            <div className="h-6 w-6">
                <Icon className='h-6 w-6' />
            </div>
            {isHovered && <span className="text-sm whitespace-nowrap">{label}</span>}
        </button>

    )
}

interface TabsContentProps { value: string; children: ReactNode }
export const TabsContent: FC<TabsContentProps> = ({ value, children }) => {
    const ctx = useContext(TabsContext)
    if (!ctx) throw new Error('TabsContent must be used within <Tabs>')
    return <div
        className={clsx('transition-all duration-200', {
            'hidden': value !== ctx.activeId,
            'block': value === ctx.activeId
        })}
    >
        {children}
    </div>
}