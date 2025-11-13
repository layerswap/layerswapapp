"use client";

import { X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"
import { useWidgetContext } from '@/context/ConfigContext';

export function CloseButton() {
    const { showPanel, updateShowPanel } = useWidgetContext();
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <X
                    onClick={() => updateShowPanel(!showPanel)}
                    className=' w-8 h-8 p-1 rounded-full bg-transparent hover:bg-primary-500 transition-colors ' />
            </TooltipTrigger >
            <TooltipContent >
                <p>Close</p>
            </TooltipContent>
        </Tooltip>
    );
}