import { ISelectMenuItem } from '../Shared/Props/selectMenuItem';
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandWrapper
} from '../../shadcn/command';
import React, { useCallback, useState } from 'react';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import SelectItem from '../Shared/SelectItem';
import { SelectProps } from '../Shared/Props/SelectProps';
import Modal from '../../modal/modal';
import SpinIcon from '../../icons/spinIcon';
import { LeafletHeight } from '../../modal/leaflet';
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
}

export default function CommandSelect({ values, value, setValue, show, setShow, searchHint, valueGrouper, groupedCurrencies, isLoading, modalHeight = 'full', modalContent }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();
    const [searchQuery, setSearchQuery] = useState('');

    let groups: SelectMenuItemGroup[] = valueGrouper(values);
    const handleSelectValue = useCallback((item: ISelectMenuItem) => {
        setValue(item);
        setShow(false);
    }, [setValue, setShow]);

    const filterItems = (items: ISelectMenuItem[]) =>
        items.filter(
            (item) =>
                item?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item?.id?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    return (
        <Modal height={modalHeight} show={show} setShow={setShow} modalId='commandSelect'>
            {show ? (
                <CommandWrapper>
                    {searchHint && <input
                        autoFocus={isDesktop}
                        placeholder={searchHint}
                        value={searchQuery}
                        onChange={handleSearchChange} 
                        className="h-11 px-2 py-4 w-full bg-transparent border-0 focus border-b mb-2 border-secondary-500 focus:border-transparent focus:border-b-secondary-500 focus:ring-0 placeholder:text-primary-text-placeholder placeholder:text-lg  disabled:cursor-not-allowed disabled:opacity-50"
                    />}
                    {modalContent}
                    {!isLoading ? (
                        <CommandList className='p-1'>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {groupedCurrencies?.length ? (
                                groupedCurrencies.map((g) => (
                                    g.items && g.items.length > 0 ? (
                                        <CommandGroup key={g.name} heading={g.name}>
                                            {filterItems(g.items).map((item) =>
                                                item.subItems ? (
                                                    <div className='group' key={item.id}>
                                                        <div className="relative items-center flex-shrink-0 w-4 top-6">
                                                            {item.icon}
                                                        </div>
                                                        <Accordion type="single" collapsible key={item.name}>
                                                            <AccordionItem value={item.name}>
                                                                <AccordionTrigger
                                                                    className={`flex mb-1 ml-4 items-center w-full overflow-hidden rounded-md py-2 px-1.5 gap-2 hover:bg-secondary-500 data-[state=open]:bg-secondary`}
                                                                >
                                                                    <div className="whitespace-nowrap flex items-center gap-2 flex-grow">
                                                                        {item.logo}
                                                                        {item.displayName}
                                                                        <div className="flex flex-col w-full items-end space-y-2 self-baseline">
                                                                            <p className='text-secondary-text text-sm'>{item?.balanceAmount ? `$${item.balanceAmount}` : ''}</p>
                                                                            <div className="flex justify-end items-center w-full relative">
                                                                                {item?.balanceAmount ? item.subItems?.filter(i => i?.balanceAmount)?.map((subItem, index) => (
                                                                                    <div
                                                                                        key={subItem.id}
                                                                                        className="w-3.5 absolute"
                                                                                        style={{ right: `${index * 3.5}%` }}
                                                                                    >
                                                                                        {subItem.logo}
                                                                                    </div>
                                                                                )) : null}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent>
                                                                    {item.subItems.map((subItem) => {
                                                                        return (
                                                                            <div className="flex group" key={subItem.id}>
                                                                                <div className="relative items-center flex-shrink-0 w-4">
                                                                                    {subItem.icon}
                                                                                </div>
                                                                                <CommandItem
                                                                                    className="grow bg-secondary"
                                                                                    value={subItem.id}
                                                                                    onSelect={() => handleSelectValue(subItem)}
                                                                                >
                                                                                    <SelectItem item={subItem} />
                                                                                </CommandItem>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        </Accordion>
                                                    </div>
                                                ) : (
                                                    <div className="flex group" key={item.id}>
                                                        <div className="relative items-center flex-shrink-0 w-4">
                                                            {item.icon}
                                                        </div>
                                                        <CommandItem
                                                            className="grow"
                                                            value={item.id}
                                                            onSelect={() => handleSelectValue(item)}
                                                        >
                                                            <SelectItem item={item} />
                                                        </CommandItem>
                                                    </div>
                                                )
                                            )}
                                        </CommandGroup>
                                    ) : null
                                ))
                            ) : (
                                <div>
                                    {groups.filter(group => group.items?.length > 0).map((group) => (
                                        <CommandGroup key={group.name} heading={group.name}>
                                            {filterItems(group.items).map(item => (
                                                <CommandItem value={item.id} key={item.id} onSelect={() => handleSelectValue(item)}>
                                                    <div className="relative items-center flex-shrink-0 w-3">
                                                        {item.icon}
                                                    </div>
                                                    <SelectItem item={item} />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    ))}
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