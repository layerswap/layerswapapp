import { FC, useState } from 'react'
import { Listbox } from '@headlessui/react'
import React from 'react'
import { SelectMenuProps } from './selectMenuProps'
import SelectMenuOptions from './selectMenuOptions'
import SelectMenuButtonContent from './selectMenuButtonContent'

let SelectMenu: FC<SelectMenuProps> = ({ name, value, values, setFieldValue, label, disabled }) => {
    const [selected, setSelected] = useState(value)
    React.useEffect(() => {
        name && selected && setFieldValue && setFieldValue(name, selected);
    }, [name, selected, setFieldValue]);
    return (
        <Listbox disabled={disabled} value={selected} onChange={setSelected}>
            <Listbox.Label className="block text-sm font-medium text-white">{label}</Listbox.Label>
            <div className="mt-1 relative">
                <Listbox.Button className="focus:ring-indigo-500 focus:border-indigo-500 w-full pl-3 pr-10 py-2 bg-gray-800 border-gray-600 border focus:ring-1 font-semibold rounded-md">
                    <SelectMenuButtonContent value={selected} />
                </Listbox.Button>

                <SelectMenuOptions values={values} />
            </div>
        </Listbox>
    )
}
export default SelectMenu;