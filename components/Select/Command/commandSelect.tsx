import { ISelectMenuItem } from '../Shared/Props/selectMenuItem'
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandWrapper
} from '../../shadcn/command'
import React, { useCallback, useState } from "react";
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import SelectItem from '../Shared/SelectItem';
import { SelectProps } from '../Shared/Props/SelectProps'
import Modal from '../../modal/modal';
import { Check, Info } from 'lucide-react';
import SpinIcon from '../../icons/spinIcon';
import { LayerDisabledReason } from '../Popover/PopoverSelect';
import { Layer } from '../../../Models/Layer';
import ResizablePanel from '../../ResizablePanel';

export interface CommandSelectProps extends SelectProps {
    show: boolean;
    setShow: (value: boolean) => void;
    searchHint: string;
    valueGrouper: (values: ISelectMenuItem[]) => SelectMenuItemGroup[];
    isLoading: boolean;
    isExchange?: boolean;
}

export class SelectMenuItemGroup {
    constructor(init?: Partial<SelectMenuItemGroup>) {
        Object.assign(this, init);
    }

    name: string;
    items: ISelectMenuItem[];
}

export default function CommandSelect({ values, value, setValue, show, setShow, searchHint, valueGrouper, isLoading, isExchange }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();

    let groups: SelectMenuItemGroup[] = valueGrouper(values);
    const handleSelectValue = useCallback((item: ISelectMenuItem) => {
        setValue(item)
        setShow(false)
    }, [setValue])
    return (
        <Modal height='80%' show={show} setShow={setShow} modalId='comandSelect' >
            {show ?
                <CommandWrapper>
                    {searchHint && <CommandInput autoFocus={isDesktop} placeholder={searchHint} />}
                    {
                        value?.isAvailable.disabledReason === LayerDisabledReason.LockNetworkIsTrue &&
                        <div className='text-xs text-left text-secondary-text mb-2'>
                            <Info className='h-3 w-3 inline-block mb-0.5' /><span>&nbsp;You&apos;re accessing Layerswap from a partner&apos;s page. In case you want to transact with other networks, please open layerswap.io in a separate tab.</span>
                        </div>
                    }
                    {isExchange &&

                        <div className="relative z-20 mb-2 ml-3 text-secondary-text text-sm">
                            <p className="text-sm mt-2 flex space-x-1">
                                <span>Please make sure that the exchange supports the token and network you select here.</span>
                            </p>
                        </div>

                    }
                    {!isLoading ?
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {groups.filter(g => g.items?.length > 0).map((group) => {
                                return (
                                    <CommandGroup key={group.name} heading={group.name}>
                                        {group.items.map(item => {
                                            return (
                                                <CommandItem disabled={!item.isAvailable.value} value={item.name} key={item.id} onSelect={() => handleSelectValue(item)}>
                                                    <SelectItem item={item} />
                                                </CommandItem>
                                            )
                                        })
                                        }
                                    </CommandGroup>)
                            })}
                        </CommandList>
                        :
                        <div className='flex justify-center h-full items-center'>
                            <SpinIcon className="animate-spin h-5 w-5" />
                        </div>
                    }
                </CommandWrapper>
                : <></>
            }
        </Modal>
    )
}