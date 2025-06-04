import { X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, } from "@/components/ui/tooltip"

export function CloseButton() {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <X className=' w-8 h-8 p-1 rounded-full bg-transparent hover:bg-primary-500 transition-colors ' />
            </TooltipTrigger >
            <TooltipContent >
                <p>Close</p>
            </TooltipContent>
        </Tooltip>
    );
}