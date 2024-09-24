import { ISelectMenuItem } from '../Shared/Props/selectMenuItem';
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandWrapper
} from '../../shadcn/command';
import React, { useCallback } from 'react';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import SelectItem from '../Shared/SelectItem';
import { SelectProps } from '../Shared/Props/SelectProps';
import Modal from '../../modal/modal';
import SpinIcon from '../../icons/spinIcon';
import { LeafletHeight } from '../../modal/leaflet';
import Image from 'next/image'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shadcn/accordion';

export interface CommandSelectProps extends SelectProps {
    show: boolean;
    setShow: (value: boolean) => void;
    searchHint: string;
    valueGrouper: (values: ISelectMenuItem[]) => SelectMenuItemGroup[];
    groupedCurrencies?: SelectMenuItemGroup[];
    isLoading?: boolean;
    modalHeight?: LeafletHeight;
    modalContent?: React.ReactNode;
}

export class SelectMenuItemGroup {
    constructor(init?: Partial<SelectMenuItemGroup>) {
        Object.assign(this, init);
    }

    name: string;
    items: ISelectMenuItem[];
    groupLogo?: JSX.Element;
    groupIcon?: JSX.Element;
}

export default function CommandSelect({ values, value, setValue, show, setShow, searchHint, valueGrouper, groupedCurrencies, isLoading, modalHeight = 'full', modalContent }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();

    let groups: SelectMenuItemGroup[] = valueGrouper(values);
    const handleSelectValue = useCallback((item: ISelectMenuItem) => {
        setValue(item);
        setShow(false);
    }, [setValue, setShow]);

    return (
        <Modal height={modalHeight} show={show} setShow={setShow} modalId='commandSelect'>
            {show ? (
                <CommandWrapper>
                    {searchHint && <CommandInput autoFocus={isDesktop} placeholder={searchHint} />}
                    {modalContent}
                    {!isLoading ? (
                        <CommandList className='p-1'>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {groupedCurrencies && groupedCurrencies.length > 0 ? (
                                groupedCurrencies.map((group) =>
                                    group.items.length > 1 ? (
                                        <div className='group' key={group.items[0].id}>
                                            <div className="w-3 relative flex">
                                                {group.groupIcon}
                                            </div>
                                            <Accordion type="single" collapsible key={group.name}>
                                                <AccordionItem value={group.name}>
                                                    <AccordionTrigger className='flex ml-3 items-center w-full overflow-hidden rounded-md p-2 gap-2 hover:bg-secondary-500'>
                                                        <div className="flex items-center gap-2 flex-grow">
                                                            {group.groupLogo}
                                                            {group.name}
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        {group.items.map((item) => (
                                                            <div className="flex group" key={item.id}>
                                                                <div className="relative items-center flex-shrink-0 w-3">
                                                                    {item.icon}
                                                                </div>
                                                                <CommandItem
                                                                    className="grow"
                                                                    value={item.id}
                                                                    key={item.id}
                                                                    onSelect={() => handleSelectValue(item)}
                                                                >
                                                                    <SelectItem item={item} />
                                                                </CommandItem>
                                                            </div>
                                                        ))}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>
                                    ) : (
                                        <div className="flex group" key={group.items[0].id}>
                                            <div className="relative items-center flex-shrink-0 w-3">
                                                {group.groupIcon}
                                            </div>
                                            <CommandItem
                                                className="grow"
                                                value={group.items[0].id}
                                                onSelect={() => handleSelectValue(group.items[0])}
                                            >
                                                <SelectItem item={group.items[0]} />
                                            </CommandItem>
                                        </div>
                                    )
                                )
                            ) : (
                                <div>
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    {groups.filter(g => g.items?.length > 0).map((group) => {
                                        console.log(groups)
                                        return (
                                            <CommandGroup key={group.name} heading={group.name}>
                                                {group.items.map(item => {
                                                    return (
                                                        <CommandItem value={item.id} key={item.id} onSelect={() => handleSelectValue(item)}>
                                                            <div className="relative items-center flex-shrink-0 w-3">
                                                                {item.icon}
                                                            </div>
                                                            <SelectItem item={item} />
                                                        </CommandItem>
                                                    )
                                                })
                                                }
                                            </CommandGroup>)
                                    })}
                                </div>
                            )}
                        </CommandList>
                    ) : (
                        <div className="flex justify-center h-full items-center">
                            <SpinIcon className="animate-spin h-5 w-5" />
                        </div>
                    )}
                </CommandWrapper>
            ) : undefined}
        </Modal>
    );
}