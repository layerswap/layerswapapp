"use client";
import { useWidgetContext } from '@/context/ConfigContext';
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"
import Rotate from '@/public/icons/Rotate';

export function ResetButton() {
    const { resetData } = useWidgetContext();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Rotate onClick={resetData} className=' w-6 h-6 p-1 bg-transparent hover:bg-secondary-300 transition-colors' />
            </TooltipTrigger>
            <TooltipContent >
                <p>Reset</p>
            </TooltipContent>
        </Tooltip>
    );
}