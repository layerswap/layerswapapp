import { FC } from 'react'
import { Listbox } from '@headlessui/react'
import { SelectMenuProps } from './selectMenuProps'
import SelectMenuButtonContent from './selectMenuButtonContent'
import BaseSelectMenu from './baseSelectMenu'

let SelectMenu: FC<SelectMenuProps> = (props) => {

    return (
        <BaseSelectMenu {...props}>
            <Listbox.Button className="w-full pl-3 pr-10 py-2 bg-gray-800 border-gray-600 border focus:ring-1 font-semibold rounded-md">
                <SelectMenuButtonContent value={props.value} />
            </Listbox.Button>
        </BaseSelectMenu>
    )
}
export default SelectMenu;