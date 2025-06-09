"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
    className,
    disabled,
    ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            disabled={disabled}
            className={cn(
                "peer inline-flex h-6 w-12 shrink-0 items-center rounded-full border border-secondary-500 shadow-xs transition-all outline-none bg-secondary-600 data-[state=checked]:bg-secondary-600 data-[state=unchecked]:bg-secondary-600 focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                className={cn(
                    "block size-6 rounded-full ring-0 transition-transform pointer-events-none data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0 bg-secondary-text",
                    disabled
                        ? "bg-muted-foreground"
                        : "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground"
                )}
            />
        </SwitchPrimitive.Root>
    )
}

export { Switch }
