import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { classNames } from "../utils/classNames"

interface AccordionContextValue {
    value: string | string[] | undefined
    onValueChange: (value: string | string[] | undefined) => void
    type: "single" | "multiple"
    collapsible?: boolean
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

interface AccordionProps {
    type: "single" | "multiple"
    value?: string | string[]
    defaultValue?: string | string[]
    onValueChange?: (value: string | string[] | undefined) => void
    collapsible?: boolean
    className?: string
    children: React.ReactNode
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
    ({ type, value, defaultValue, onValueChange, collapsible = false, className, children, ...props }, ref) => {
        const [internalValue, setInternalValue] = React.useState<string | string[] | undefined>(
            value ?? defaultValue
        )

        const currentValue = value !== undefined ? value : internalValue
        const handleValueChange = onValueChange || setInternalValue

        const contextValue = React.useMemo(() => ({
            value: currentValue,
            onValueChange: handleValueChange,
            type,
            collapsible
        }), [currentValue, handleValueChange, type, collapsible])

        return (
            <AccordionContext.Provider value={contextValue}>
                <div ref={ref} className={className} {...props}>
                    {children}
                </div>
            </AccordionContext.Provider>
        )
    }
)
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value: itemValue, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext)
    if (!context) throw new Error("AccordionItem must be used within Accordion")

    return (
        <div ref={ref} className={className} data-value={itemValue} {...props}>
            {children}
        </div>
    )
})
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const context = React.useContext(AccordionContext)
    if (!context) throw new Error("AccordionTrigger must be used within Accordion")

    const itemElement = React.useContext(AccordionItemContext)
    if (!itemElement) throw new Error("AccordionTrigger must be used within AccordionItem")

    const { value: accordionValue, onValueChange, type, collapsible } = context
    const { value: itemValue } = itemElement

    const isOpen = React.useMemo(() => {
        if (type === "multiple") {
            return Array.isArray(accordionValue) && accordionValue.includes(itemValue)
        }
        return accordionValue === itemValue
    }, [accordionValue, itemValue, type])

    const handleClick = () => {
        if (type === "multiple") {
            const currentValue = Array.isArray(accordionValue) ? accordionValue : []
            if (isOpen) {
                onValueChange(currentValue.filter(v => v !== itemValue))
            } else {
                onValueChange([...currentValue, itemValue])
            }
        } else {
            if (isOpen && collapsible) {
                onValueChange(undefined)
            } else if (!isOpen) {
                onValueChange(itemValue)
            }
        }
    }

    return (
        <button
            type="button"
            ref={ref}
            className={classNames("w-full grow", className)}
            onClick={handleClick}
            aria-expanded={isOpen}
            {...props}
        >
            {children}
        </button>
    )
})
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionItemContextValue {
    value: string
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null)

const AccordionItemProvider = ({ value, children }: { value: string; children: React.ReactNode }) => {
    const contextValue = React.useMemo(() => ({ value }), [value])
    return (
        <AccordionItemContext.Provider value={contextValue}>
            {children}
        </AccordionItemContext.Provider>
    )
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
    estimatedHeight?: number
    itemsCount?: number
}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
    ({ className, children, estimatedHeight, itemsCount, ...props }, ref) => {
        const context = React.useContext(AccordionContext)
        const itemContext = React.useContext(AccordionItemContext)
        
        if (!context) throw new Error("AccordionContent must be used within Accordion")
        if (!itemContext) throw new Error("AccordionContent must be used within AccordionItem")

        const { value: accordionValue, type } = context
        const { value: itemValue } = itemContext

        const isOpen = React.useMemo(() => {
            if (type === "multiple") {
                return Array.isArray(accordionValue) && accordionValue.includes(itemValue)
            }
            return accordionValue === itemValue
        }, [accordionValue, itemValue, type])

        // Calculate dynamic duration based on items count
        const heightDuration = React.useMemo(() => {
            if (!itemsCount) return 0.15
            
            // Base duration: 0.1s
            // Add 0.01s per item, max 0.4s
            const baseDuration = 0.1
            const perItemDuration = 0.01
            const maxDuration = 0.4
            
            return Math.min(baseDuration + (itemsCount * perItemDuration), maxDuration)
        }, [itemsCount])

        return (
            <motion.div
                initial={false}
                animate={{
                    height: isOpen ? (estimatedHeight || "auto") : 0,
                    opacity: isOpen ? 1 : 0
                }}
                transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                    height: { duration: isOpen ? heightDuration : 0.15 },
                    opacity: { duration: 0.1, delay: isOpen ? 0.05 : 0 }
                }}
                style={{ overflow: "hidden" }}
                className={classNames("AccordionContent", className)}
            >
                <AnimatePresence mode="wait">
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                        >
                            <div ref={ref} className="pt-1" {...props}>
                                {children}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        )
    }
)
AccordionContent.displayName = "AccordionContent"

const EnhancedAccordionItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ value, children, ...props }, ref) => (
    <AccordionItemProvider value={value}>
        <AccordionItem ref={ref} value={value} {...props}>
            {children}
        </AccordionItem>
    </AccordionItemProvider>
))
EnhancedAccordionItem.displayName = "AccordionItem"

export { Accordion, EnhancedAccordionItem as AccordionItem, AccordionTrigger, AccordionContent }
