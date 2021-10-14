import { FC, Fragment, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, SelectorIcon } from '@heroicons/react/solid'
import Image from 'next/image'
import React from 'react'
import { SelectMenuProps } from './props/SelectMenuProps'

function joinClassNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

let SelectMenu: FC<SelectMenuProps> = ({ name, value, values, setFieldValue, label }) => {
    const [selected, setSelected] = useState(value)
    React.useEffect(() => {
        name && selected && setFieldValue && setFieldValue(name, selected);
    }, [name, selected, setFieldValue]);
    return (
        <Listbox value={selected} onChange={setSelected}>
            <Listbox.Label className="block text-sm font-medium text-gray-700">{label}</Listbox.Label>
            <div className="mt-1 relative">
                <Listbox.Button className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-base font-semibold">
                    <span className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6 relative">
                            <Image
                                src={selected.imgSrc}
                                alt="Project Logo"
                                priority
                                height="1.5rem"
                                width="1.5rem"
                                layout="responsive"
                                className="rounded-full object-contain"
                            />
                        </div>
                        <span className="ml-3 block truncate text-gray-600">{selected.name}</span>
                    </span>
                    <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <SelectorIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                </Listbox.Button>

                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute z-10 mt-1 x-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-sm md:text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                        {values.map((item) => (
                            <Listbox.Option
                                key={item.id}
                                disabled={!item.isEnabled}
                                className={({ active, disabled }) =>
                                    styleOption(active, disabled)
                                }
                                value={item}
                            >
                                {({ selected, active, disabled }) => (
                                    <>
                                        <div className="flex items-center justify-start">
                                            <div className="flex-shrink-0 h-6 w-6 relative">
                                                <Image
                                                    src={item.imgSrc}
                                                    alt="Project Logo"
                                                    height="1.5rem"
                                                    width="1.5rem"
                                                    layout="responsive"
                                                    className="rounded-full object-contain"
                                                />
                                            </div>
                                            <div className={joinClassNames(selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate')}                                                    >
                                                <div className={disabled ? 'inline group-hover:hidden' : null}>{item.name}</div>
                                                <div className={disabled ? 'hidden group-hover:inline' : 'hidden'}>Soon..</div>
                                            </div>
                                        </div>

                                        {selected ? (
                                            <span
                                                className={joinClassNames(
                                                    active ? 'text-white' : 'text-indigo-600',
                                                    'absolute inset-y-0 right-0 flex items-center pr-4'
                                                )}
                                            >
                                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </>
                                )}
                            </Listbox.Option>
                        ))}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    )
}

function styleOption(active: boolean, disabled: boolean) {
    let classNames = 'cursor-default select-none relative py-2 pl-3 pr-9 group';
    if (disabled) {
        return 'bg-gray-200 cursor-not-allowed ' + classNames;
    }
    if (active) {
        return 'text-white bg-indigo-500 ' + classNames;
    }
    else {
        return 'text-gray-900 ' + classNames;
    }
}

export default SelectMenu;