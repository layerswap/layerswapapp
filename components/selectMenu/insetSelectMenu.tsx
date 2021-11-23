import { FC, useState } from 'react'
import { Listbox } from '@headlessui/react'
import React from 'react';
import SelectMenuOptions from './selectMenuOptions';
import { SelectMenuProps } from './selectMenuProps';
import SelectMenuButtonContent from './selectMenuButtonContent';

let InsetSelectMenu: FC<SelectMenuProps> = ({ name, value, values, setFieldValue }) => {
    const [selected, setSelected] = useState(value)
    const [availableValues, setAvailableValues] = useState(values);

    React.useEffect(() => {
        if (values.length != availableValues.length) {
            updateValues();
        }
        else {
            for (var i = 0; i < values.length; i++) {
                if (values[i].id != availableValues[i].id) {
                    updateValues();
                }
            }
        }
    }, [values, availableValues]);

    function updateValues() {
        setAvailableValues(values);
        if (!values.some(x => x.id === selected.id)) {
            var defaultValue = values.filter(x => x.isDefault)[0] ?? values[0];
            setSelected(defaultValue);
        }
    }

    React.useEffect(() => {
        name && selected && setFieldValue && setFieldValue(name, selected);
    }, [name, selected, setFieldValue]);

    return (
        <Listbox value={selected} onChange={setSelected}>
            <div className="mt-1 relative">

                <Listbox.Button className="focus:ring-indigo-500 focus:border-indigo-500 w-full py-0 pl-8 pr-12 border-transparent bg-transparent font-semibold rounded-md">
                    <SelectMenuButtonContent value={selected} />
                </Listbox.Button>

                <SelectMenuOptions values={values} />
            </div>
        </Listbox>
    )
}

export default InsetSelectMenu;