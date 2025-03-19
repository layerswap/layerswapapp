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
import VaulDrawer from '../../modal/vaulModal';

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
                    {
                        searchHint &&
                        <CommandInput
                            ref={inputRef}
                            placeholder={searchHint}
                        />
                    }
                    {modalContent}
                    {
                        !isLoading ?
                            <CommandList>
                                <CommandEmpty>No results found.</CommandEmpty>
                                {groups.filter(g => g.items?.length > 0).map((group) => {
                                    return (
                                        <CommandGroup key={group.name} heading={group.name}>
                                            {group.items.map(item => {
                                                return (
                                                    <CommandItem value={item.name} key={item.id} onSelect={() => handleSelectValue(item)}>
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
            </VaulDrawer.Snap>
        </VaulDrawer>
    )
}