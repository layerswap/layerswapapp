"use client";

import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"
import { useWidgetContext } from '@/context/ConfigContext';
import IconX from '@/public/icons/IconX';

export function CloseButton() {
    const { showPanel, updateShowPanel } = useWidgetContext();
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={() => updateShowPanel(!showPanel)}
                    className='rounded-xl w-6 h-6 flex items-center justify-center bg-transparent hover:bg-secondary-300 transition-colors'>
                    <IconX className='w-[16px] h-[16px]' />
                </button>
            </TooltipTrigger >
            <TooltipContent >
                <p>Close</p>
            </TooltipContent>
        </Tooltip>
    );
}