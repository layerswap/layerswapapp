"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion"  {...props} className={cn("tw-rounded-md tw-border tw-bg-transparent  tw-border-secondary-500 tw-dark:text-primary-text tw-bg-secondary-700 placeholder:tw-text-secondary-text ", props.className)} />
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
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="tw-flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "focus-visible:tw-border-ring focus-visible:tw-ring-ring/50 tw-flex tw-flex-1 tw-rounded-md  tw-bg-transparent  tw-border-secondary-500 dark:tw-text-primary-text tw-bg-secondary-700 placeholder:tw-text-secondary-text tw-items-start tw-justify-between tw-gap-4 tw-p-3 tw-text-left tw-text-base  tw-transition-all tw-outline-none  focus-visible:tw-ring-[3px] disabled:tw-pointer-events-none disabled:tw-opacity-50 [&[data-state=open]>svg]:tw-rotate-180",
          className
        )}
        {...props}
      >
        {children}
        {/* <ChevronDownIcon className=" fill-currenttext-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200  dark:text-secondary-text placeholder:text-secondary-text" /> */}
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
      className="data-[state=closed]:tw-animate-accordion-up data-[state=open]:tw-animate-accordion-down tw-overflow-hidden tw-text-sm"
      {...props}
    >
      <div className={cn("pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
