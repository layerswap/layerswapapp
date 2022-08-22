import { Combobox, Listbox, Transition } from '@headlessui/react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { SearchIcon } from '@heroicons/react/solid'
import Image from 'next/image'
import { ExclamationCircleIcon, XIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/outline'
import { SelectMenuItem } from './selectMenuItem'
import { classNames } from '../utils/classNames'
export interface SelectProps<T> {
    name: string;
    value: SelectMenuItem<T>;
    values: SelectMenuItem<T>[];
    disabled: boolean;
    placeholder: string;
    smallDropdown?: boolean;
    setFieldValue: (field: string, value: SelectMenuItem<T>, shouldValidate?: boolean) => void
}

export default function Select<T>({ values, setFieldValue, name, value, placeholder, disabled, smallDropdown = false }: SelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')

    const [selectedItem, setSelectedItem] = useState<SelectMenuItem<T> | undefined>(value || undefined)

    function onChangeHandler(newValue: string) {
        setFieldValue(name, values.find(x => x.id === newValue));
    }

    useEffect(() => {
        if (value) {
            setSelectedItem(value)
        }
        else
            setSelectedItem(undefined)
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
    if (smallDropdown)
        return (
            <Listbox disabled={disabled} value={value?.id} onChange={onChangeHandler}>
                <div className="mt-1 relative">
                    <Listbox.Button name={name} className="focus:ring-indigo-500 focus:border-indigo-500 w-full py-0 pl-8 pr-12 border-transparent bg-transparent font-semibold rounded-md">
                        {
                            value &&
                            <>
                                <span className="flex items-center">
                                    <div className="flex-shrink-0 h-6 w-6 relative">
                                        <Image
                                            src={value.imgSrc}
                                            alt="Project Logo"
                                            priority
                                            height="40"
                                            width="40"
                                            layout="responsive"
                                            className="rounded-md object-contain"
                                        />
                                    </div>
                                    <span className="ml-3 block truncate">{value.name}</span>
                                </span>

                                <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-light-blue">
                                    <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
                                </span>
                            </>
                        }
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Listbox.Options className="ring-1 ring-darkblue-100 absolute origin-top-right right-0 z-10 mt-2 x-1 w-full md:w-56 bg-darkblue-600 rounded-md py-1 overflow-hidden focus:outline-none">
                            {values.map((item) => (
                                <Listbox.Option
                                    key={item.id}
                                    disabled={!item.isEnabled}
                                    className={({ active, disabled }) =>
                                        styleOption(active, disabled)
                                    }
                                    value={item.id}
                                >
                                    {({ selected, disabled }) => (
                                        <>
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-6 w-6 relative">
                                                    <Image
                                                        src={item.imgSrc}
                                                        alt="Project Logo"
                                                        height="40"
                                                        width="40"
                                                        layout="responsive"
                                                        className="rounded-md object-contain "
                                                    />
                                                </div>
                                                <div className={classNames(selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate')}                                                    >
                                                    <div className={disabled ? 'inline group-hover:hidden' : null}>{item.name}</div>
                                                    <div className={disabled ? 'hidden group-hover:inline' : 'hidden'}>Disabled</div>
                                                </div>
                                            </div>

                                            {selected ? (
                                                <span className="text-white absolute inset-y-0 right-0 flex items-center px-4">
                                                    <CheckIcon className="h-6 w-6" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>)
    return (
        <>
            <div className="flex items-center relative">
                <button
                    type="button"
                    name={name} 
                    onClick={openModal}
                    disabled={disabled}
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
                        {selectedItem
                            ?
                            <span className="ml-3 block font-medium text-white flex-auto items-center">
                                {selectedItem?.name}
                            </span>
                            :
                            <span className="ml-3 block font-medium text-pink-primary-300 flex-auto items-center">
                                {placeholder}
                            </span>}
                    </span>
                    <span className="ml-3 right-0 flex items-center pr-2 pointer-events-none  text-white">
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
                                        className="rounded-md text-darkblue-200 hover:text-pink-primary-300"
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

                        <div className="relative inset-0 flex flex-col">
                            <div className="relative min-h-full items-center justify-center p-2 pt-0 text-center">
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
                                            <Combobox.Options static className="border-0 max-h-[425px] grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                                                {filteredItems.map((item) => (
                                                    <Combobox.Option
                                                        key={item.id}
                                                        value={item}
                                                        disabled={!item.isEnabled || !item.isAvailable}
                                                        className={`flex text-left ${item.id === selectedItem?.id ? 'bg-darkblue-300' : 'bg-darkblue-500'} ${!item.isEnabled || !item.isAvailable ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}  hover:bg-darkblue-300 select-none rounded-lg p-3`}
                                                        onClick={() => handleSelect(item)}
                                                    >
                                                        {({ active, disabled }) => (
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


function styleOption(active: boolean, disabled: boolean) {
    let classNames = 'cursor-pointer select-none relative py-2 m-1.5 rounded-md px-3 pr-9 group';
    if (disabled) {
        return 'text-gray-400 bg-gray-600 opacity-20 cursor-not-allowed ' + classNames;
    }
    if (active) {
        return 'text-white bg-darkblue-300 ' + classNames;
    }
    else {
        return 'text-white ' + classNames;
    }
}