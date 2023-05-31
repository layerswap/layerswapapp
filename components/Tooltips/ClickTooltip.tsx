import { Info } from 'lucide-react';
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
                    <div className='text-primary-text hover:cursor-pointer hover:text-white ml-0.5 hover:bg-secondary-400 active:ring-2 active:ring-gray-200 active:bg-secondary-500 focus:outline-none cursor-default p-0.5 rounded'>
                        <Info className="h-4" aria-hidden="true" strokeWidth={3} />
                    </div>
                }
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content className='bg-secondary-700 border-2 border-secondary-400 z-50 shadow-lg rounded-md p-2 w-fit max-w-[192px] leading-4 text-sm mt-1'>
                    <span className={`text-primary-text whitespace-no-wrap word-break ${moreClassNames}`}>
                        {text}
                    </span>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
})

export default ClickTooltip