import { Popover } from "@headlessui/react";
import { FC } from "react";

type Props = {
    children: JSX.Element | JSX.Element[],
    text: string;
    moreClassNames?: string;
}

const ClickTooltip: FC<Props> = (({ children, text, moreClassNames }) => {
    return (
        <>
            <Popover>
                <Popover.Button>
                    {children}
                </Popover.Button>
                <Popover.Panel>
                    <div className="ml-1 text-white">
                        <div className="relative">
                            <div className={`w-fit absolute flex flex-col mb-3 ${moreClassNames}`}>
                                <span className="leading-4 min z-10 p-2 text-xs text-center text-white whitespace-no-wrap bg-darkblue-300 shadow-lg rounded-md">
                                    {text}
                                </span>
                            </div>
                        </div>
                    </div>
                </Popover.Panel>
            </Popover>
        </>
    )
})

export default ClickTooltip