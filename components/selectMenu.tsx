import { Fragment, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, SelectorIcon } from '@heroicons/react/solid'
import Image from 'next/image'
import React from 'react';

export class SelectMenuItem {
    id: string;
    name: string;
    imgSrc: StaticImageData;
    isEnabled: boolean;

    constructor(id: string, name: string, imgSrc: StaticImageData, isEnabled: boolean = true) {
        this.id = id;
        this.name = name;
        this.imgSrc = imgSrc;
        this.isEnabled = isEnabled;
    }
}

export interface SelectMenuProps {
    values: SelectMenuItem[];
    value: SelectMenuItem;
}

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

let SelectMenu= ({ name, value, values, setFieldValue }) => {
    const [selected, setSelected] = useState(value)
    React.useEffect(() => {
        name && setFieldValue && setFieldValue(name, selected);
    }, [name, selected, setFieldValue]);
    return (
        <Listbox value={selected} onChange={setSelected}>
            {({ open }) => (
                <>
                    <div className="mt-1 relative">
                        <Listbox.Button className="focus:ring-indigo-500 focus:border-indigo-500 w-full h-full py-0 pl-2 pr-12 border-transparent bg-transparent text-gray-500 sm:text-sm rounded-md">
                            <span className="flex items-center">
                                <div className="flex-shrink-0 h-6 w-6 relative">
                                    <Image
                                        src={selected.imgSrc}
                                        alt="Project Logo"
                                        layout="fill" // required
                                        className="rounded-full"
                                    />
                                </div>
                                <span className="ml-3 block truncate">{selected.name}</span>
                            </span>
                            <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <SelectorIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                        </Listbox.Button>

                        <Transition
                            show={open}
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-56 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                {values.map((item) => (
                                    <Listbox.Option
                                        key={item.id}
                                        disabled={!item.isEnabled}
                                        className={({ active }) =>
                                            classNames(
                                                active ? 'text-white bg-indigo-600' : 'text-gray-900',
                                                'cursor-default select-none relative py-2 pl-3 pr-9'
                                            )
                                        }
                                        value={item}
                                    >
                                        {({ selected, active, disabled }) => (
                                            <>
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-6 w-6 relative">
                                                        <Image
                                                            src={item.imgSrc}
                                                            alt="Project Logo"
                                                            layout="fill" // required
                                                            className="rounded-full" // just an example
                                                        />
                                                    </div>
                                                    <span
                                                        className={classNames(selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate')}
                                                    >
                                                        {item.name}
                                                    </span>
                                                </div>

                                                {selected ? (
                                                    <span
                                                        className={classNames(
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
                </>
            )}
        </Listbox>
    )
}

export default SelectMenu ;