import { InformationCircleIcon } from "@heroicons/react/outline";
import { FC } from "react";
import { text } from "stream/consumers";

type Props = {
    text: string;
    moreClassNames?: string;
    positionClassnames?: string
}

const HoverTooltip: FC<Props> = (({text, moreClassNames, positionClassnames}) => { 
    return (
        <>
            <div className="ml-1 text-white inset-y-0 -right-4 flex items-center group">
                <div className="absolute flex flex-col items-center">
                    <div className={`absolute min-w-full -right-6 bottom-0 flex-col items-right mb-3 hidden group-hover:flex ${moreClassNames}`}>
                        <span className="leading-4 min z-50 p-2 text-xs text-left text-white whitespace-no-wrap bg-darkblue-300 shadow-lg rounded-md">
                            {text}
                        </span>
                        <div className={`absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-darkblue-100 ${positionClassnames}`}></div>
                    </div>
                </div>
                <div className="justify-self-end">
                    <InformationCircleIcon className="h-5 w-5 opacity-30" aria-hidden="true" />
                </div>
            </div>
        </>
    )
})

export default HoverTooltip