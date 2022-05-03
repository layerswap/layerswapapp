import { Combobox, Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { SearchIcon } from '@heroicons/react/solid'
import Image from 'next/image'

import {
    ExclamationCircleIcon,
    PencilAltIcon,
    XIcon,
} from '@heroicons/react/outline'

type Item<T> = {
    id: string;
    name: string;
    imgSrc: string;
    isEnabled: boolean;
    baseObject: T;
    isDefault: boolean;
}

const items = [
    {
        id: 1,
        name: 'Blah blah',
        description: 'Add freeform text with basic formatting options.',
        url: '#',
        color: 'bg-indigo-500',
        icon: PencilAltIcon,
    },
    {
        id: 2,
        name: 'Text 2',
        description: 'Add freeform text with basic formatting options.',
        url: '#',
        color: 'bg-indigo-500',
        icon: PencilAltIcon,
    },
    {
        id: 3,
        name: 'Text 3',
        description: 'Add freeform text with basic formatting options.',
        url: '#',
        color: 'bg-indigo-500',
        icon: PencilAltIcon,
    },
    {
        id: 4,
        name: 'Text 4',
        description: 'Add freeform text with basic formatting options.',
        url: '#',
        color: 'bg-indigo-500',
        icon: PencilAltIcon,
    },
]

export default function Select<T>({ items }: { items: Item<T>[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [selectedItem, setSelectedItem] = useState<Item<T> | undefined>()

    function closeModal() {
        setIsOpen(false)
    }

    function openModal() {
        setIsOpen(true)
    }
    const filteredItems =
        query === ''
            ? items
            : items.filter((item) => {
                return item.name.toLowerCase().includes(query.toLowerCase())
            })

    return (
        <>
            <div className="inset-0 flex items-center justify-center">
                <button
                    type="button"
                    onClick={openModal}
                    className="focus:outline-none rounded-md bg-black bg-opacity-20 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-30 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
                >
                    {selectedItem?.name || "Open dialog"}
                </button>
            </div>

            <Transition appear show={isOpen} as={Fragment}>
                <div className='absolute inset-0 z-10 overflow-y-visible w-full bg-darkBlue p-10'>
                    <div className="hidden sm:block absolute top-0 right-0 pt-4 pr-4">
                        <button
                            type="button"
                            className="rounded-md text-darkblue-200 focus:ring-2 hover:text-light-blue"
                            onClick={() => closeModal()}
                        >
                            <span className="sr-only">Close</span>
                            <XIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
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
                        <div className="relative inset-0" />
                    </Transition.Child>

                    <div className="relative inset-0 overflow-y-visible">
                        <div className="relative min-h-full items-center justify-center p-4 text-center">
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
                                    className="transform  transition-all"
                                    onChange={() => { }}
                                    value={selectedItem?.name || query}
                                >
                                    <div className="relative mb-5">
                                        <SearchIcon
                                            className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-light-blue"
                                            aria-hidden="true"
                                        />
                                        <Combobox.Input
                                            className="h-12 w-full bg-darkblue-500 rounded-lg border-ouline-blue pl-11 pr-4 text-light-blue placeholder-light-blue focus:ring-0 focus:border-pink-primary sm:text-sm"
                                            placeholder="Search..."
                                            onChange={(event) => setQuery(event.target.value)}
                                            value={query}
                                        />
                                    </div>
                                    {filteredItems.length > 0 && (
                                        <Combobox.Options static className="border-0 max-h-96 scroll-py-3 overflow-y-auto grid grid-cols-2 gap-2">
                                            {filteredItems.map((item) => (
                                                <Combobox.Option
                                                    key={item.id}
                                                    value={item}
                                                    className={({ active }) =>
                                                        classNames('flex text-left bg-darkblue-300 hover:bg-darkblue-500 cursor-pointer select-none rounded-lg p-3', active && 'bg-gray-100')
                                                    }
                                                    onClick={() => { setSelectedItem(item); setIsOpen(false) }}
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
                                                                        layout="responsive"
                                                                        className="rounded-md object-contain"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="ml-4 flex-auto">
                                                                <p className={classNames('text-sm font-medium', active ? 'text-light-blue' : 'text-light-blue')}>
                                                                    {item.name}
                                                                </p>
                                                            </div>
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
                                                className="mx-auto h-6 w-6 text-light-blue"
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
            </Transition>
        </>
    )
}


/*
  This example requires Tailwind CSS v3.0+ 
  
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/




function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

