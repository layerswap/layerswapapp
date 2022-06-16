import { FC, useEffect } from 'react'
import { Listbox } from '@headlessui/react'
import { SelectMenuProps } from './selectMenuProps'
import SelectMenuOptions from './selectMenuOptions'

let BaseSelectMenu: FC<SelectMenuProps> = ({ name, value, values, setFieldValue, label, disabled, children}) => {
    function onChangeHandler(newValue: string) {
        setFieldValue(name, values.find(x => x.id === newValue));
    }

    useEffect(() => {
        if (!values.some(x => x.id === value?.id)) {
            var defaultValue = values.filter(x => x.isDefault)[0] ?? values[0];
            if (defaultValue) {
                onChangeHandler(defaultValue.id);
            }
        }
    })

    return (
        <Listbox disabled={disabled} value={value?.id} onChange={onChangeHandler}>
            {label && <Listbox.Label className="block text-base font-medium text-white">{label}</Listbox.Label>}
            <div className="mt-1 relative">
                {children}
                <SelectMenuOptions values={values} />
            </div>
        </Listbox>
    )
}
export default BaseSelectMenu;