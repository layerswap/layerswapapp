import { Listbox } from '@headlessui/react'
import Image from 'next/image'
import { classNames } from '../../utils/classNames'
import { AnimatePresence, motion } from "framer-motion";
import toast from 'react-hot-toast'
import { SelectProps } from '../Shared/Props/SelectProps'
import { Command, CommandItem, CommandList, CommandWrapper } from '../../shadcn/command';
import SelectItem from '../Shared/SelectItem';

export default function PopoverSelect({ values, value, setValue }: SelectProps) {

    return (
        <CommandWrapper>
            <CommandList>
                {values.map(item =>
                    <CommandItem disabled={!item.isAvailable.value} value={item.id} key={item.id} onSelect={(currentValue) => {
                        setValue(item)
                    }}>
                        <SelectItem item={item} />
                    </CommandItem>)
                }
            </CommandList>
        </CommandWrapper>
    )
}

export enum DisabledReason {
    LockNetworkIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.'
}