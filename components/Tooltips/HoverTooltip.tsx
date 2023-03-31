import { Info } from "lucide-react";
import { FC } from "react";

type Props = {
    text: string;
    moreClassNames?: string;
    positionClassnames?: string;
    children?: JSX.Element | JSX.Element[] | string
}

const HoverTooltip: FC<Props> = (({ text, moreClassNames, positionClassnames, children }) => {
    return (
        <>
            <div className="ml-1 inset-y-0 -right-4 flex items-center group">
                <div className="absolute flex flex-col items-center">
                    <div className={`absolute min-w-full bottom-0 flex-col items-right text-xs text-left mb-3 hidden group-hover:flex ${moreClassNames}`}>
                        <span className="leading-4 z-50 p-2 whitespace-no-wrap bg-darkblue-400 shadow-lg rounded-md">
                            {text}
                        </span>
                        <div className={`absolute right-0 bottom-0 origin-top-left w-3 h-3 -mt-2 rotate-45 bg-darkblue-500 ${positionClassnames}`}></div>
                    </div>
                </div>
                <div className="justify-self-end">
                    {
                        children ?? <Info className="h-5 w-5 opacity-30" aria-hidden="true" />
                    }
                </div>
            </div>
        </>
    )
})

export default HoverTooltip
