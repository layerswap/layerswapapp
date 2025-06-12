"use client";
import { RotateCcw } from 'lucide-react';
import { useWidgetContext } from '@/context/ConfigContext';
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"

export function ResetButton() {
    const { resetData } = useWidgetContext();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <RotateCcw onClick={resetData} className='tw-w-8 tw-h-8 tw-p-1 tw-rounded-full tw-bg-transparent hover:tw-bg-primary-500 tw-transition-colors ' />
            </TooltipTrigger>
            <TooltipContent >
                <p>Reset</p>
            </TooltipContent>
        </Tooltip>
    );
}