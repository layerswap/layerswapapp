import { ISelectMenuItem } from '../Shared/Props/selectMenuItem'
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandWrapper
} from '../../shadcn/command'
import React from "react";
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import SelectItem from '../Shared/SelectItem';
import { SelectProps } from '../Shared/Props/SelectProps'
import Modal from '../../modal/modal';
import { Info } from 'lucide-react';

export interface CommandSelectProps extends SelectProps {
    show: boolean;
    setShow: (value: boolean) => void;
    searchHint: string;
    valueGrouper: (values: ISelectMenuItem[]) => SelectMenuItemGroup[];
}

export class SelectMenuItemGroup {
    constructor(init?: Partial<SelectMenuItemGroup>) {
        Object.assign(this, init);
    }

    name: string;
    items: ISelectMenuItem[];
}

export default function CommandSelect({ values, value, setValue, show, setShow, searchHint, valueGrouper }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();

    let groups: SelectMenuItemGroup[] =  valueGrouper(values);

    return (
        <Modal height='full' show={show} setShow={setShow}>
            {show &&
                <CommandWrapper>
                    {show && <>
                        <CommandInput autoFocus={isDesktop} placeholder={searchHint} />
                        {
                            !values.some(v => v.isAvailable.value === true) &&
                            <div className='text-xs text-left text-primary-text mb-2'>
                                <Info className='h-3 w-3 inline-block mb-0.5' /> You're accessing Layerswap from a partner's page. In case you want to transact with other networks, please open layerswap.io in a separate tab.
                            </div>
                        }
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {groups.filter(g => g.items?.length > 0).map((group) => {
                                return (
                                    <CommandGroup key={group.name} heading={group.name}>
                                        {group.items.map(item =>
                                            <CommandItem disabled={!item.isAvailable.value} value={item.name} key={item.id} onSelect={() => {
                                                setValue(item)
                                                setShow(false)
                                            }}>
                                                <SelectItem item={item} />
                                            </CommandItem>)
                                        }
                                    </CommandGroup>)
                            })}
                        </CommandList>
                    </>}
                </CommandWrapper>
            }
        </Modal>
    )
}