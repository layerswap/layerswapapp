"use client";
import { RotateCcw } from 'lucide-react';
import { useWidgetContext } from '@/context/ConfigContext';
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"

export function ResetButton() {
    const { resetData } = useWidgetContext();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <RotateCcw onClick={resetData} className=' w-8 h-8 p-1 rounded-full bg-transparent hover:bg-primary-500 transition-colors ' />
            </TooltipTrigger>
            <TooltipContent >
                <p>Reset</p>
            </TooltipContent>
        </Tooltip>
    );
}