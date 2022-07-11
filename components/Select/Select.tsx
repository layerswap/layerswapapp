import { Combobox, Dialog, Transition } from '@headlessui/react'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { SearchIcon } from '@heroicons/react/solid'
import Image from 'next/image'

import {
    ExclamationCircleIcon,
    XIcon,
    ChevronDownIcon,
    CheckIcon
} from '@heroicons/react/outline'
import { SelectMenuItem } from '../selectMenu/selectMenuItem'
import { useMenuState } from '../../context/menu'

export interface SelectProps<T> {
    name: string;
    value: SelectMenuItem<T>;
    values: SelectMenuItem<T>[];
    disabled: boolean;
    placeholder: string;
    setFieldValue: (field: string, value: SelectMenuItem<T>, shouldValidate?: boolean) => void
}

export default function Select<T>({ values, setFieldValue, name, value, placeholder, disabled }: SelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')

    const initialValue = value ? values?.find(v => v.id === value.id) : undefined
    const [selectedItem, setSelectedItem] = useState<SelectMenuItem<T> | undefined>(value || undefined)


    useEffect(() => {
        if (value)
            setSelectedItem(value)
    }, [value])

    function closeModal() {
        setIsOpen(false)
    }

    function openModal() {
        setIsOpen(true)
    }

    const filteredItems =
        query === ''
            ? values
            : values.filter((item) => {
                return item.name.toLowerCase().includes(query.toLowerCase())
            })

    const handleSelect = useCallback((item: SelectMenuItem<T>) => {
        setIsOpen(false)
        setSelectedItem(item)
        setFieldValue(name, item, true)
    }, [name])

    const handleComboboxChange = useCallback(() => { }, [])
    const handleQueryInputChange = useCallback((event) => setQuery(event.target.value), [])

    return (
        <>
            <div className="flex items-center relative">
                <button
                    type="button"
                    onClick={openModal}
                    disabled={disabled}
                    // ref={asdRef}
                    className="disabled:cursor-not-allowed disabled:hidden relative grow h-12 flex items-center text-left justify-bottom w-full pl-3 pr-2 py-2 bg-darkblue-600 font-semibold rounded-none"
                >
                    <span className='flex grow text-left items-center'>
                        {
                            selectedItem && <div className="flex items-center">
                                <div className="flex-shrink-0 h-6 w-6 relative">
                                    <Image
                                        src={selectedItem.imgSrc}
                                        alt="Project Logo"
                                        height="40"
                                        width="40"
                                        loading="eager"
                                        priority
                                        layout="responsive"
                                        className="rounded-md object-contain"
                                    />
                                </div>
                            </div>
                        }
                        <span className="ml-3 block font-medium text-pink-primary-300 flex-auto items-center">
                            {selectedItem?.name || placeholder}
                        </span>
                    </span>
                    <span className="ml-3 right-0 flex items-center pr-2 pointer-events-none  text-pink-primary-300">
                        <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                </button>
            </div>

            <Transition
                appear
                show={isOpen}
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full">
                <div className='absolute inset-0 z-40 -inset-y-11 flex flex-col w-full bg-darkBlue'>
                <div className='relative z-40 overflow-hidden bg-darkBlue p-6 pt-0'>
                        <div className='relative grid grid-cols-1 gap-4 place-content-end z-40 mb-2 mt-1'>
                            <span className="justify-self-end text-pink-primary-300 cursor-pointer">
                                <div className="block ">
                                    <button
                                        type="button"
                                        className="rounded-md text-pink-primary-300 focus:ring-2 hover:text-pink-primary-300"
                                        onClick={closeModal}
                                    >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                            </span>
                        </div>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="relative inset-0" ></div>
                        </Transition.Child>

                        <div className="relative inset-0 flex flex-col overflow-y-auto scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                            <div className="relative min-h-full items-center justify-center p-4 pt-0 text-center">
                                <Transition.Child
                                    as={Fragment}
                                    enter="ease-out duration-300"
                                    enterFrom="opacity-0 scale-95"
                                    enterTo="opacity-100 scale-100"
                                    leave="ease-in duration-200"
                                    leaveFrom="opacity-100 scale-100"
                                    leaveTo="opacity-0 scale-95"
                                >
                                    <Combobox
                                        as="div"
                                        className="transform  transition-all "
                                        onChange={handleComboboxChange}
                                        value={query}
                                    >
                                        <div className="relative mb-5">
                                            <SearchIcon
                                                className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-pink-primary-300"
                                                aria-hidden="true"
                                            />
                                            <Combobox.Input
                                                className="h-12 w-full bg-darkblue-500 rounded-lg border-ouline-blue pl-11 pr-4 text-pink-primary-300 placeholder-pink-primary-300 focus:ring-0 sm:text-sm"
                                                placeholder="Search..."
                                                onChange={handleQueryInputChange}
                                                value={query}
                                            />
                                        </div>
                                        {filteredItems.length > 0 && (
                                            <Combobox.Options static className="border-0 max-h-96  grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {filteredItems.map((item) => (
                                                    <Combobox.Option
                                                        key={item.id}
                                                        value={item}
                                                        disabled={!item.isEnabled || !item.isAvailable}
                                                        className={`flex text-left ${item.id === selectedItem?.id ? 'bg-darkblue-300' : 'bg-darkblue-500'} ${!item.isEnabled || !item.isAvailable ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}  hover:bg-darkblue-300 select-none rounded-lg p-3`}
                                                        onClick={() => handleSelect(item)}
                                                    >
                                                        {({ active }) => (
                                                            <>
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 h-6 w-6 relative">
                                                                        <Image
                                                                            src={item.imgSrc}
                                                                            alt="Project Logo"
                                                                            height="40"
                                                                            width="40"
                                                                            loading="eager"
                                                                            layout="responsive"
                                                                            className="rounded-md object-contain"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="ml-4 flex-auto">
                                                                    <p className='text-sm font-medium'>
                                                                        {item.name}
                                                                    </p>
                                                                </div>
                                                                {
                                                                    item.id === selectedItem?.id && <div className="justify-self-end">
                                                                        <CheckIcon className="h-6 w-6" aria-hidden="true" />
                                                                    </div>
                                                                }
                                                            </>
                                                        )}
                                                    </Combobox.Option>
                                                ))}
                                            </Combobox.Options>
                                        )}

                                        {query !== '' && filteredItems.length === 0 && (
                                            <div className="py-14 px-6 text-center text-sm sm:px-14">
                                                <ExclamationCircleIcon
                                                    type="outline"
                                                    name="exclamation-circle"
                                                    className="mx-auto h-6 w-6 text-pink-primary-300"
                                                />
                                                <p className="mt-4 font-semibold text-gray-900">No results found</p>
                                                <p className="mt-2 text-gray-500">No components found for this search term. Please try again.</p>
                                            </div>
                                        )}
                                    </Combobox>
                                </Transition.Child>
                            </div>
                        </div>
                    </div>
                </div>

            </Transition>
        </>
    )
}

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

