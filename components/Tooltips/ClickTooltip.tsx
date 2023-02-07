import { InformationCircleIcon } from '@heroicons/react/outline';
import * as Popover from '@radix-ui/react-popover';
import { FC } from "react";

type Props = {
    children?: JSX.Element | JSX.Element[],
    text: string | JSX.Element | JSX.Element[];
    moreClassNames?: string
}

const ClickTooltip: FC<Props> = (({ children, text, moreClassNames }) => {
    return (
        <Popover.Root>
            <Popover.Trigger>
                {
                    children ??
                    <div className='opacity-50 ml-1 hover:bg-darkblue-200 active:ring-2 active:ring-gray-200 active:bg-darkblue-400 focus:outline-none cursor-default p-0.5 rounded'>
                        <InformationCircleIcon className="h-4" aria-hidden="true" />
                    </div>
                }
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content className='bg-darkblue-300 shadow-lg rounded-md p-2 w-fit max-w-[192px] leading-4 text-xs mt-1'>
                    <span className={`text-primary-text whitespace-no-wrap word-break ${moreClassNames}`}>
                        {text}
                    </span>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
})

export default ClickTooltip