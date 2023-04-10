import { Combobox, Listbox } from '@headlessui/react'
import { useCallback, useState } from 'react'
import Image from 'next/image'
import { AlertCircle, X, ChevronDown, Check, Info } from 'lucide-react'
import { SelectMenuItem } from './selectMenuItem'
import { classNames } from '../utils/classNames'
import { AnimatePresence, motion } from "framer-motion";
import SlideOver from '../SlideOver'
import toast from 'react-hot-toast'

export interface SelectProps<T> {
    name: string;
    header: string;
    value: SelectMenuItem<T>;
    values: SelectMenuItem<T>[];
    disabled: boolean;
    placeholder: string;
    smallDropdown?: boolean;
    setFieldValue: (field: string, value: SelectMenuItem<T>, shouldValidate?: boolean) => void;
    lockNetwork?: boolean;
    lockExchange?: boolean
}

export default function Select<T>({ values, setFieldValue, name, value, placeholder, disabled, smallDropdown = false, lockNetwork, lockExchange, header }: SelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false)

    function onChangeHandler(newValue: string) {
        setFieldValue(name, values.find(x => x.id === newValue), true);
    }

    function openModal() {
        setIsOpen(true)
    }

    const handleSelect = useCallback((item: SelectMenuItem<T>) => {
        setIsOpen(false)
        setFieldValue(name, item, true)
    }, [name])

    const handleComboboxChange = useCallback(() => { }, [])

    const valueList = (
        <div className="relative inset-0 flex flex-col h-full">
            {
                !values.some(v => v.isAvailable.value === true) && (lockNetwork || lockExchange) &&
                <div className='text-xs text-left text-primary-text mb-2'>
                    <Info className='h-3 w-3 inline-block mb-0.5' /> You’re accessing Layerswap from a partner’s page. In case you want to transact with other networks, please open layerswap.io in a separate tab.
                </div>
            }
            <div className="relative min-h-full items-center justify-center pt-0 text-center text-white">
                <Combobox
                    as="div"
                    className="transform transition-all h-full"
                    onChange={handleComboboxChange}
                >
                    {values.length > 0 && (
                        <Combobox.Options static className="border-0 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto styled-scroll">
                            {values.map((item) => (
                                <Combobox.Option
                                    key={item.id}
                                    value={item}
                                    disabled={!item.isAvailable.value}
                                    className={`flex text-left ${item.id === value?.id ? 'bg-darkblue-500' : 'bg-darkblue-700'} ${!item.isAvailable.value ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}  hover:bg-darkblue-500 select-none rounded-lg p-3`}
                                    onClick={item.id === value?.id ? () => setFieldValue(name, null) : () => handleSelect(item)}
                                >
                                    {({ active, disabled }) => (
                                        <div onClick={() => item.isAvailable.disabledReason === DisabledReason.InsufficientLiquidity && toast(item.isAvailable.disabledReason)} className='flex items-center w-full justify-between'>
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-6 w-6 relative">
                                                    {item.imgSrc && <Image
                                                        src={item.imgSrc}
                                                        alt="Project Logo"
                                                        height="40"
                                                        width="40"
                                                        loading="eager"
                                                        className="rounded-md object-contain" />}
                                                </div>
                                                <div className="ml-4 ">
                                                    <p className='text-sm font-medium'>
                                                        {item.name}
                                                    </p>
                                                </div>
                                            </div>


                                            {item.id === value?.id && item.isAvailable.value &&
                                                <div className='flex items-center'>
                                                    <div className="bg-darkblue-700 hover:bg-darkblue-600 rounded-md border border-darkblue-600 hover:border-darkblue-200 duration-200 transition p-0.5">
                                                        <X className='h-4 w-4' />
                                                    </div>
                                                </div>
                                            }
                                            {!item.isAvailable.value && !lockNetwork && !lockExchange &&
                                                <div className='hover:bg-darkblue-400 active:ring-2 active:ring-gray-200 active:bg-darkblue-500 focus:outline-none cursor-default p-0.5 rounded hover:cursor-pointer'>
                                                    <Info className='h-4 text-primary-text' />
                                                </div>
                                            }
                                        </div>
                                    )}
                                </Combobox.Option>
                            ))}
                        </Combobox.Options>
                    )}

                    {values.length === 0 && (
                        <div className="py-8 px-6 text-center text-primary-text text-sm sm:px-14">
                            <AlertCircle
                                name="exclamation-circle"
                                className="mx-auto h-16 w-16 text-primary" />
                            <p className="mt-4 font-semibold">No 'items' found.</p>
                            <p className="mt-2">Please try later.</p>
                        </div>
                    )}
                </Combobox>
            </div>
        </div>
    )

    if (smallDropdown)
        return (
            <Listbox disabled={disabled} value={value?.id} onChange={onChangeHandler}>
                <div className="relative">
                    <Listbox.Button name={name} className="w-full py-0 pl-3 md:pl-5 pr-10 border-transparent bg-transparent font-semibold rounded-md">
                        {
                            value &&
                            <>
                                <span className="flex items-center">
                                    <div className="flex-shrink-0 h-6 w-6 relative">
                                        {
                                            value.imgSrc && <Image
                                                src={value.imgSrc}
                                                alt="Project Logo"
                                                priority
                                                height="40"
                                                width="40"
                                                className="rounded-md object-contain"
                                            />
                                        }

                                    </div>
                                    <span className="ml-3 block truncate text-white">{value.name}</span>
                                </span>

                                <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white">
                                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                </span>
                            </>
                        }
                    </Listbox.Button>
                    <AnimatePresence>
                        <Listbox.Options className="ring-1 ring-darkblue-500 absolute origin-top-right right-0 z-10 mt-2 x-1 w-40 md:w-56 bg-darkblue-700 rounded-md py-1 overflow-hidden focus:outline-none">
                            {values.map((item) => (
                                <Listbox.Option
                                    key={item.id}
                                    disabled={!item.isAvailable.value}
                                    className={({ active, disabled }) =>
                                        styleOption(active, disabled)
                                    }
                                    value={item.id}
                                >
                                    {({ selected, disabled }) => (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{
                                                opacity: 1,
                                                transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                                            }}
                                            exit={{
                                                opacity: 0,
                                                transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
                                            }}
                                            onClick={() => item.isAvailable.disabledReason === DisabledReason.InsufficientLiquidity && toast(item.isAvailable.disabledReason)}
                                        >
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-6 w-6 relative">
                                                    {
                                                        item.imgSrc && <Image
                                                            src={item.imgSrc}
                                                            alt="Project Logo"
                                                            height="40"
                                                            width="40"
                                                            className="rounded-md object-contain "
                                                        />
                                                    }

                                                </div>
                                                <div className={classNames(selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate')}>
                                                    <div className={disabled ? 'inline group-hover:hidden' : null}>{item.name}</div>
                                                    <div className={disabled ? 'hidden group-hover:inline' : 'hidden'}>Disabled</div>
                                                </div>
                                            </div>

                                            {selected ? (
                                                <span className="text-white absolute inset-y-0 right-0 flex items-center px-4">
                                                    <Check className="h-6 w-6" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </motion.div>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </AnimatePresence>
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
                    className="rounded-lg focus-peer:ring-primary focus-peer:border-darkblue-500 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 flex items-center text-left justify-bottom w-full pl-3 pr-2 py-2 bg-darkblue-700 font-semibold"
                >
                    <span className='flex grow text-left items-center'>
                        {
                            value && <div className="flex items-center">
                                <div className="flex-shrink-0 h-6 w-6 relative">
                                    {
                                        value.imgSrc && <Image
                                            src={value.imgSrc}
                                            alt="Project Logo"
                                            height="40"
                                            width="40"
                                            loading="eager"
                                            priority
                                            className="rounded-md object-contain"
                                        />
                                    }

                                </div>
                            </div>
                        }
                        {value
                            ?
                            <span className="ml-3 block font-medium text-white flex-auto items-center">
                                {value?.name}
                            </span>
                            :
                            <span className="ml-3 block font-medium text-primary-text flex-auto items-center">
                                {placeholder}
                            </span>}
                    </span>
                    <span className="ml-3 right-0 flex items-center pr-2 pointer-events-none  text-white">
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </span>
                </button>
            </div>
            <SlideOver imperativeOpener={[isOpen, setIsOpen]} place='inStep' header={header}>
                {() => (
                    valueList
                )}
            </SlideOver>
        </>
    )
}

export enum DisabledReason {
    LockNetworkIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.'
}

function styleOption(active: boolean, disabled: boolean) {
    let classNames = 'cursor-pointer select-none relative py-2 m-1.5 rounded-md px-3 pr-9 group';
    if (disabled) {
        return 'text-gray-400 bg-darkblue-200 opacity-20 cursor-not-allowed ' + classNames;
    }
    if (active) {
        return 'text-white bg-darkblue-400 ' + classNames;
    }
    else {
        return 'text-white ' + classNames;
    }
}