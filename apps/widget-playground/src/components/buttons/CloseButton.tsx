"use client";

import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"
import { useWidgetContext } from '@/context/ConfigContext';
import IconX from '@/public/icons/IconX';

export function CloseButton() {
    const { showPanel, updateShowPanel } = useWidgetContext();
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <IconX
                    onClick={() => updateShowPanel(!showPanel)}
                    className=' w-6 h-6 p-1 bg-transparent hover:bg-secondary-300 transition-colors' />
            </TooltipTrigger >
            <TooltipContent >
                <p>Close</p>
            </TooltipContent>
        </Tooltip>
    );
}