"use client";
import { useWidgetContext } from '@/context/ConfigContext';
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"
import Rotate from '@/public/icons/Rotate';

export function ResetButton() {
    const { resetData } = useWidgetContext();

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={resetData}
                    className='rounded-xl w-6 h-6 flex items-center justify-center bg-transparent hover:bg-secondary-300 transition-colors'>
                    <Rotate className='w-[18px] h-[18px]' />
                </button>
            </TooltipTrigger>
            <TooltipContent >
                <p>Reset</p>
            </TooltipContent>
        </Tooltip>
    );
}