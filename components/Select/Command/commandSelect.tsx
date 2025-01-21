import { ISelectMenuItem } from '../Shared/Props/selectMenuItem';
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandWrapper
} from '../../shadcn/command';
import React, { useCallback, useEffect, useState } from 'react';
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
    walletComp?: React.ReactNode;
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

export default function CommandSelect({ values, value, setValue, show, setShow, searchHint, valueGrouper, groupedCurrencies, isLoading, modalHeight = 'full', modalContent, walletComp }: CommandSelectProps) {
    const { isDesktop } = useWindowDimensions();
    const [searchQuery, setSearchQuery] = useState('');

    let groups: SelectMenuItemGroup[] = valueGrouper(values);
    const handleSelectValue = useCallback((item: ISelectMenuItem) => {
        setValue(item);
        setShow(false);
    }, [setValue, setShow]);

    useEffect(() => {
        if (!show) {
            setSearchQuery('');
        }
    }, [show])

    const filterItems = (items: ISelectMenuItem[]) => {
        const filtered = items.filter(
            (item) =>
                item?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item?.id?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filtered
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    return (
        <Modal height={modalHeight} show={show} setShow={setShow} modalId='commandSelect' walletComp={walletComp}>
            {show ? (
                <CommandWrapper>
                    {searchHint && (
                        <input
                            autoFocus={isDesktop}
                            placeholder={searchHint}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="h-11 px-2 py-4 w-full bg-transparent border-0 focus border-b mb-2 border-secondary-500 focus:border-transparent focus:border-b-secondary-500 focus:ring-0 placeholder:text-primary-text-placeholder placeholder:text-lg  disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    )}
                    {modalContent}
                    {!isLoading ? (
                        <CommandList className="p-1 overflow-visible">
                            {/*  TODO No unwrapped JSX text
                            {!filterItems?.length && searchQuery && (
                                <div className="py-6 text-center text-sm">No results found.</div>
                            )} */}
                            {(searchQuery || !groupedCurrencies?.length) ?
                                groups.filter(group => group.items?.length > 0).map(group => (
                                    <CommandGroup key={group.name} heading={filterItems(group.items)?.length ? group.name : ""}>
                                        {filterItems(group.items).map(item => (
                                            <CommandItem value={item.id} key={item.id} onSelect={() => handleSelectValue(item)}>
                                                <SelectItem item={item} />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                ))
                                :
                                groupedCurrencies?.length ? (
                                    groupedCurrencies.map(g => (
                                        g.items && g.items.length > 0 ? (
                                            g.name === 'Selected Network' ? (
                                                <CommandGroup key={g.name} heading={g.name}>
                                                    {filterItems(g.items).map(item =>
                                                        item?.subItems?.map(subItem => (
                                                            <div className="flex group" key={subItem.id}>
                                                                <CommandItem
                                                                    className="grow"
                                                                    value={subItem.id}
                                                                    onSelect={() => handleSelectValue(subItem)}
                                                                >
                                                                    <SelectItem item={subItem} />
                                                                </CommandItem>
                                                            </div>
                                                        ))
                                                    )}
                                                </CommandGroup>
                                            ) : (
                                                <CommandGroup key={g.name} heading={g.name}>
                                                    {filterItems(g.items).map(item => (
                                                        <div key={item.id}>
                                                            <div className="relative items-center flex-shrink-0 w-4 top-6 -left-4">
                                                                {item.leftIcon}
                                                            </div>
                                                            <Accordion type="single" collapsible key={item.name} defaultValue="Selected Network">
                                                                <AccordionItem value={item.name}>
                                                                    <AccordionTrigger className="flex mb-1 items-center w-full overflow-hidden rounded-md p-2 gap-2 hover:bg-secondary-500 data-[state=open]:bg-secondary">
                                                                        <div className="whitespace-nowrap flex items-center gap-2 flex-grow">
                                                                            {item.logo}
                                                                            {item.displayName}
                                                                            <div className="flex flex-col w-full items-end space-y-2 self-baseline">
                                                                                <p className="text-secondary-text text-sm">
                                                                                    {item?.balanceAmount}
                                                                                    {/* {(item?.balanceAmount || item?.balanceAmount === 0) ? `$${new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.balanceAmount)}` : ''} */}
                                                                                </p>
                                                                                <div className="flex justify-end items-center w-full relative">
                                                                                    {item?.balanceAmount
                                                                                        ? item.subItems?.filter(i => i?.balanceAmount)?.map(
                                                                                            (subItem, index) => (
                                                                                                <div
                                                                                                    key={subItem.id}
                                                                                                    className="w-3.5 absolute"
                                                                                                    style={{ right: `${index * 4}%` }}
                                                                                                >
                                                                                                    {subItem.logo}
                                                                                                </div>
                                                                                            )
                                                                                        )
                                                                                        : null}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </AccordionTrigger>
                                                                    <AccordionContent className="rounded-md">
                                                                        {item?.subItems?.map(subItem => (
                                                                            <div className="flex group" key={subItem.id}>
                                                                                <CommandItem
                                                                                    className="grow bg-secondary"
                                                                                    value={subItem.id}
                                                                                    onSelect={() => handleSelectValue(subItem)}
                                                                                >
                                                                                    <SelectItem item={subItem} />
                                                                                </CommandItem>
                                                                            </div>
                                                                        ))}
                                                                    </AccordionContent>
                                                                </AccordionItem>
                                                            </Accordion>
                                                        </div>
                                                    ))}
                                                </CommandGroup>
                                            )
                                        ) : null
                                    ))
                                ) : null}
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