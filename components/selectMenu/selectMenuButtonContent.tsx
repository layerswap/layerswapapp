import { FC } from 'react'
import { ISelectMenuItem } from './selectMenuItem';
import Image from 'next/image'
import { SelectorIcon } from '@heroicons/react/solid'

export interface SelectMenuButtonContentProps {
    value: ISelectMenuItem;
}

let SelectMenuButtonContent: FC<SelectMenuButtonContentProps> = ({ value }) => {
    if (!value)
    {
        return <></>
    }
    return (
        <>
            <span className="flex items-center">
                <div className="flex-shrink-0 h-6 w-6 relative">
                    <Image
                        src={value.imgSrc}
                        alt="Project Logo"
                        priority
                        height="40"
                        width="40"
                        layout="responsive"
                        className="rounded-md object-contain"
                    />
                </div>
                <span className="ml-3 block truncate">{value.name}</span>
            </span>
            <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <SelectorIcon className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
        </>
    );
}

export default SelectMenuButtonContent;