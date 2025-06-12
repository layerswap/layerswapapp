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
                    className=' tw-w-8 tw-h-8 tw-p-1 tw-rounded-full tw-bg-transparent hover:tw-bg-primary-500 tw-transition-colors ' />
            </TooltipTrigger >
            <TooltipContent >
                <p>Close</p>
            </TooltipContent>
        </Tooltip>
    );
}