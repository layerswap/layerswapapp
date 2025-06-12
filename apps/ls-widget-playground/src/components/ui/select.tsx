"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "tw-flex tw-w-full tw-items-center tw-justify-between tw-rounded-md tw-border tw-bg-transparent tw-p-3  tw-text-base tw-bg-secondary-700 placeholder:tw-text-secondary-text focus:tw-outline-none focus:tw-ring-0 disabled:tw-cursor-not-allowed disabled:tw-opacity-50 tw-border-secondary-500 dark:tw-text-primary-text",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="tw-fill-currenttext-muted-foreground tw-pointer-events-none tw-size-4 tw-shrink-0 tw-translate-y-0.5 tw-transition-transform tw-duration-200  dark:tw-text-secondary-text placeholder:tw-text-secondary-text" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "tw-animate-in tw-fade-in-80 tw-relative tw-z-50 tw-min-w-[8rem] tw-overflow-hidden tw-rounded-md tw-shadow-md tw-ring-1 tw-ring-secondary-500 tw-bg-secondary-700 tw-text-secondary-text ",
          position === "popper" &&
          "data-[side=bottom]:tw-translate-y-1 data-[side=left]:-tw-translate-x-1 data-[side=right]:tw-translate-x-1 data-[side=top]:-tw-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "tw-p-1",
            position === "popper" &&
            "tw-h-[var(--radix-select-trigger-height)] tw-w-full tw-min-w-[var(--radix-select-trigger-width)] tw-scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("tw-py-1.5 tw-pr-2 tw-pl-8 tw-text-base tw-font-semibold tw-text-primary-text-muted", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "tw-relative tw-flex tw-cursor-default tw-select-none tw-items-center tw-rounded-sm tw-p-3  tw-pl-8 tw-text-base tw-outline-none focus:tw-bg-slate-100 data-[disabled]:tw-pointer-events-none data-[disabled]:tw-opacity-50 dark:focus:tw-bg-secondary-500",
        className
      )}
      {...props}
    >
      <span className="tw-absolute tw-left-2 tw-flex  tw-w-3.5 tw-items-center tw-justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="tw-size-4 tw-text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-tw-mx-1 tw-my-1 tw-h-px tw-bg-slate-100 dark:tw-bg-slate-700", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "tw-flex tw-cursor-default tw-items-center tw-justify-center tw-py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="tw-size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "tw-flex tw-cursor-default tw-items-center tw-justify-center tw-py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="tw-size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
