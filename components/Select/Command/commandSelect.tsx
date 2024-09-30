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

    let groups: SelectMenuItemGroup[] = valueGrouper(values);
    const handleSelectValue = useCallback((item: ISelectMenuItem) => {
        setValue(item);
        setShow(false);
    }, [setValue, setShow]);

    return (
        <Modal height={modalHeight} show={show} setShow={setShow} modalId='commandSelect'>
            {show ? (
                <CommandWrapper>
                    {searchHint && <CommandInput  autoFocus={isDesktop} placeholder={searchHint} />}
                    {modalContent}
                    {!isLoading ? (
                        <CommandList className='p-1'>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {groupedCurrencies?.length ? (
                                groupedCurrencies.map((g) => (
                                    g.items && g.items.length > 0 ? (
                                        <CommandGroup key={g.name} heading={g.name}>
                                            {g.items.map((item) =>
                                                item.subItems && item.subItems.length > 1 ? (
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
                                                                                {item.subItems.map((subItem, index) => (
                                                                                    <div
                                                                                        key={subItem.id}
                                                                                        className="w-3.5 absolute"
                                                                                        style={{ right: `${index * 3.5}%` }}
                                                                                    >
                                                                                        {subItem.logo}
                                                                                        {subItem.balanceAmount}
                                                                                    </div>
                                                                                ))}
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
                                    <CommandEmpty>No results found.</CommandEmpty>
                                    {groups.filter(group => group.items?.length > 0).map((group) => (
                                        <CommandGroup key={group.name} heading={group.name}>
                                            {group.items.map(item => (
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