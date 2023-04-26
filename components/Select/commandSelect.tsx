import { ISelectMenuItem } from './selectMenuItem'
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandModal } from '../modal/command'
import React, { Dispatch, SetStateAction } from "react";
import Image from 'next/image'
import useWindowDimensions from '../../hooks/useWindowDimensions';

class SelectMenuItemGroup {
    name: string;
    items: ISelectMenuItem[];
}

export interface CommandSelectProps {
    values: SelectMenuItemGroup[],
    value: ISelectMenuItem;
    setValue: Dispatch<SetStateAction<ISelectMenuItem>>;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
}

export default function CommandSelect({ values, value, setValue, show, setShow }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();

    return (
        <CommandModal height='full' show={show} setShow={setShow} header={"asd"}>
            <CommandInput autoFocus={isDesktop} placeholder="Swap from..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {values.map((group) => {
                    return (
                        <CommandGroup heading={group.name}>
                            {group.items.map(item =>
                                <CommandItem value={item.id} key={item.id} onSelect={(currentValue) => {
                                    setValue(currentValue === value.id.toLowerCase() ? value : values.flatMap(x => x.items).find(x => x.id.toLowerCase() === currentValue))
                                    setShow(false)
                                }}>
                                    <div className="flex items-center">
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