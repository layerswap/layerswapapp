"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "lucide-react"

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion"  {...props} className={cn("rounded-md border  border-secondary-500 dark:text-primary-text bg-secondary-700 placeholder:text-secondary-text ", props.className)} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item "
      className={cn("", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  hideChevron,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & { hideChevron?: boolean }) {
  return (
    <AccordionPrimitive.Header className="flex ">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 rounded-md   border-secondary-500 dark:text-primary-text bg-secondary-700 placeholder:text-secondary-text items-start justify-between gap-4 p-3 text-left text-base  transition-all outline-none  focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        {!hideChevron && (
          <div className="bg-secondary-500 rounded-md w-6 h-6 p-0.5 flex items-center justify-center shrink-0">
            <ChevronDownIcon className="fill-currenttext-muted-foreground pointer-events-none w-5 h-5 transition-transform duration-200 dark:text-secondary-text placeholder:text-secondary-text" />
          </div>
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
