import { FC } from 'react'
import { Listbox } from '@headlessui/react'
import React from 'react';
import { SelectMenuProps } from './selectMenuProps';
import SelectMenuButtonContent from './selectMenuButtonContent';
import BaseSelectMenu from './baseSelectMenu';

let InsetSelectMenu: FC<SelectMenuProps> = (props) => {

    return (
        <BaseSelectMenu {...props}>
            <Listbox.Button className="w-full py-0 pl-8 pr-12 border-transparent bg-transparent font-semibold rounded-md">
                <SelectMenuButtonContent value={props.value} />
            </Listbox.Button>
        </BaseSelectMenu>
    )
}

export default InsetSelectMenu;