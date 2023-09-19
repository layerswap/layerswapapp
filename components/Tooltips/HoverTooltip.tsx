import { Info } from "lucide-react";
import { FC } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../shadcn/tooltip";

type Props = {
    text: string;
    moreClassNames?: string;
    positionClassnames?: string;
    children?: JSX.Element | JSX.Element[] | string
}

const HoverTooltip: FC<Props> = (({ text, moreClassNames, positionClassnames, children }) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger className="group">
                    {
                        children ?? <Info className="h-4 group-hover:text-primary" strokeWidth={2.5} aria-hidden="true" />
                    }
                </TooltipTrigger>
                <TooltipContent>
                    {text}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
        // <>
        //     <div className="ml-1 inset-y-0 -right-4 flex items-center group hover:cursor-pointer">
        //         <div className="absolute flex flex-col items-center">
        //             <div className={`absolute min-w-full bottom-0 flex-col items-right text-xs text-left mb-3 hidden group-hover:flex ${moreClassNames}`}>
        //                 <span className="leading-4 z-50 text-white p-2 whitespace-no-wrap border-2 border-secondary-950 bg-secondary-700 shadow-lg rounded-md">
        //                     {text}
        //                 </span>
        //             </div>
        //         </div>
        //         <div className="justify-self-end group-hover:text-primary">
        //             {
        //                 children ?? <Info className="h-4" strokeWidth={2.5} aria-hidden="true" />
        //             }
        //         </div>
        //     </div>
        // </>
    )
})

export default HoverTooltip
