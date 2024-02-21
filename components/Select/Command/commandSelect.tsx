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
    network?: Layer | undefined;
}

export class SelectMenuItemGroup {
    constructor(init?: Partial<SelectMenuItemGroup>) {
        Object.assign(this, init);
    }

    name: string;
    items: ISelectMenuItem[];
}

export default function CommandSelect({ values, value, setValue, show, setShow, searchHint, valueGrouper, isLoading, isExchange, network }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();
    const [showMore, setShowMore] = useState(false);
    const handleShowMoreClick = () => {
        setShowMore(!showMore);
    };
    const handleShowLessClick = () => {
        setShowMore(false);
    };

    let groups: SelectMenuItemGroup[] = valueGrouper(values);
    const handleSelectValue = useCallback((item: ISelectMenuItem) => {
        setValue(item)
        setShow(false)
    }, [setValue])
    return (
        <Modal height='full' show={show} setShow={setShow} modalId='comandSelect' >
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

                        <div className="mb-1 rounded-md py-2 px-2 srelative m-1 bg-secondary-700 border border-secondary-500">
                            <div className="relative z-20 text-secondary-text text-sm transition-all">
                                <ResizablePanel>
                                    <div className="flex flex-col items-end w-full p-2">
                                        <p className='text-base text-primary-text flex space-x-1'>
                                            <Info className="h-4 w-4 text-secondary-text flex-shrink-0 mt-1" aria-hidden="true" />
                                            <span>Before transferring make sure the exchange supports the selected network.</span>
                                        </p>
                                        {showMore && (
                                            <p className="text-secondary-text text-sm mt-2 flex space-x-1">
                                                <span className="h-4 w-4 text-secondary-text flex-shrink-0 mt-1"></span>
                                                <span>The transaction will be executed through the network you select here. The displayed options are ordered by relevance based on historic user data. Please note that in case of picking one network here but doing the actual transfer via another network, your assets may be lost.</span>
                                            </p>
                                        )}
                                        {!showMore ?
                                            <button
                                                className="text-primary cursor-pointer float-end"
                                                onClick={handleShowMoreClick}
                                            >
                                                Show more
                                            </button>
                                            :
                                            <button
                                                className="text-primary cursor-pointer float-end"
                                                onClick={handleShowLessClick}
                                            >
                                                Show less
                                            </button>
                                        }
                                    </div>
                                </ResizablePanel>
                            </div>
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
                                                <CommandItem disabled={!item.isAvailable.value} value={item.name} key={item.name} onSelect={() => handleSelectValue(item)}>
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