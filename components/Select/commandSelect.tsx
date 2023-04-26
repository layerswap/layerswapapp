import { ISelectMenuItem, SelectMenuItemGroup } from './selectMenuItem'
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandModal
} from '../modal/command'
import React from "react";
import Image from 'next/image'
import useWindowDimensions from '../../hooks/useWindowDimensions';

export interface CommandSelectProps {
    values: SelectMenuItemGroup[],
    value: ISelectMenuItem;
    setValue: (value: ISelectMenuItem) => void;
    show: boolean;
    setShow: (value: boolean) => void;
}

export default function CommandSelect({ values, value, setValue, show, setShow }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();

    return (
        <CommandModal height='full' show={show} setShow={setShow} header={"asd"}>
            <CommandInput autoFocus={isDesktop} placeholder="Swap from..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {values.filter(g => g.items?.length > 0).map((group) => {
                    return (
                        <CommandGroup heading={group.name}>
                            {group.items.map(item =>
                                <CommandItem value={item.id} key={item.id} onSelect={(currentValue) => {
                                    setValue(item)
                                    setShow(false)
                                }}>
                                    <div className="flex items-center ">
                                        <div className="flex-shrink-0 h-6 w-6 relative">
                                            {item.imgSrc && <Image
                                                src={item.imgSrc}
                                                alt="Project Logo"
                                                height="40"
                                                width="40"
                                                loading="eager"
                                                className="rounded-md object-contain" />}
                                        </div>
                                        <div className="ml-4 ">
                                            <p className='text-md font-medium'>
                                                {item.name}
                                            </p>
                                        </div>
                                    </div>
                                </CommandItem>)
                            }
                        </CommandGroup>)
                })}
            </CommandList>
        </CommandModal>
    )
}