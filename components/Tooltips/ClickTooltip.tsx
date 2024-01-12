import { Info } from 'lucide-react';
import { FC } from "react";
import { Popover, PopoverContent, PopoverTrigger } from '../shadcn/popover';
import { classNames } from '../utils/classNames';

type Props = {
    children?: JSX.Element | JSX.Element[],
    text: string | JSX.Element | JSX.Element[];
    moreClassNames?: string
}

const ClickTooltip: FC<Props> = (({ children, text, moreClassNames }) => {
    return (
        <Popover>
            <PopoverTrigger>
                <Info className={classNames("h-4 hover:text-primary-text", moreClassNames)} aria-hidden="true" strokeWidth={2.5} />
            </PopoverTrigger>
            <PopoverContent className='text-sm'>{text}</PopoverContent>
        </Popover>
    )
})

export default ClickTooltip