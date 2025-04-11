import { ISelectMenuItem } from '../Shared/Props/selectMenuItem'
import {
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandWrapper
} from '../../shadcn/command'
import React, { useCallback } from "react";
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import SelectItem from '../Shared/SelectItem';
import { SelectProps } from '../Shared/Props/SelectProps'
import SpinIcon from '../../icons/spinIcon';
import { LeafletHeight } from '../../modal/leaflet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shadcn/accordion';
import VaulDrawer from '../../modal/vaulModal';
import { Search } from 'lucide-react';

export interface CommandSelectProps extends SelectProps {
    show: boolean;
    setShow: (value: boolean) => void;
    searchHint: string;
    valueGrouper: (values: ISelectMenuItem[]) => SelectMenuItemGroup[];
    isLoading: boolean;
    modalHeight?: LeafletHeight;
    modalContent?: React.ReactNode;
    header?: string;
}

export class SelectMenuItemGroup {
    constructor(init?: Partial<SelectMenuItemGroup>) {
        Object.assign(this, init);
    }

    name: string;
    items: ISelectMenuItem[];
}

export default function CommandSelect({ values, setValue, show, setShow, searchHint, valueGrouper, isLoading, modalHeight = 'full', modalContent, header }: CommandSelectProps) {
    const { isDesktop, isMobile, windowSize } = useWindowDimensions();

    let groups: SelectMenuItemGroup[] = valueGrouper(values);
    const handleSelectValue = useCallback((item: ISelectMenuItem) => {
        setValue(item);
        setShow(false);
    }, [setValue, setShow]);

    const inputRef = React.useRef<HTMLInputElement>(null);

    return (
        <VaulDrawer
            header={header}
            show={show}
            setShow={setShow}
            modalId='comandSelect'
            onAnimationEnd={() => { isDesktop && show && inputRef.current?.focus() }}
        >
            <VaulDrawer.Snap id='item-1'
                style={{ height: isMobile && windowSize.height ? `${(windowSize.height * 0.8).toFixed()}px` : '' }}
                constantHeight={isDesktop}
            >
                <CommandWrapper>
                    {searchHint &&
                        <CommandInput autoFocus={isDesktop} placeholder="Search">
                            <div className="pl-2">
                                <Search className="w-6 h-6 text-secondary-text" />
                            </div>
                        </CommandInput>
                    }
                    {modalContent}
                    {!isLoading ?
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            {groups.filter(g => g.items?.length > 0).map((group) => {
                                return (
                                    <Group group={group} key={group.name} />)
                            })}
                        </CommandList>
                        :
                        <div className='flex justify-center h-full items-center'>
                            <SpinIcon className="animate-spin h-5 w-5" />
                        </div>
                    }
                </CommandWrapper>
            </VaulDrawer.Snap>
        </VaulDrawer>
    )
}

type GroupProps = {
    group: SelectMenuItemGroup;
}
const Group = ({ group }: GroupProps) => {
    const [openValues, setOpenValues] = React.useState<string[]>([])
    const toggleAccordionItem = (value: string) => {
        setOpenValues((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
    };
    return <CommandGroup heading={<span className='text-secondary-text pl-2'>{group.name.toUpperCase()}</span>}>
        <Accordion type="multiple" value={openValues} onSelectCapture={() => {
            console.log('acc selected')
        }}>
            {group.items.map((item, index) => {
                return (<GroupItem key={item.id} item={item} underline={index + 1 < group.items.length} onTriggerSelect={toggleAccordionItem} />)
            })}
        </Accordion>
    </CommandGroup>
}

type GroupItemProps = {
    item: ISelectMenuItem,
    underline: boolean,
    onTriggerSelect: (itemName: string) => void;
}
const GroupItem = ({ item, underline, onTriggerSelect }: GroupItemProps) => {
    return (
        <AccordionItem value={item.name}>
            <CommandItem
                value={`${item.name} ${item.subItems?.map(si => si.name).join(" ")}`}
                key={item.id}
                onSelectCapture={() => {
                    console.log('cmd selected')
                }}
                onSelect={() => {
                    onTriggerSelect(item.name)
                }}>
                <AccordionTrigger>
                    <SelectItem item={item} underline={underline} />
                </AccordionTrigger>
            </CommandItem>
            <AccordionContent className="rounded-md">
                <div className='ml-8 border-l border-secondary-500 my-2'>
                    {
                        item.subItems?.map((subItem, index) =>
                            <CommandItem value={`${item.name} ${subItem.name}`} key={subItem.id} onSelect={() => { }}>
                                <SelectItem item={subItem} key={index} />
                            </CommandItem>
                        )
                    }
                </div>
            </AccordionContent>
        </AccordionItem>
    )
}