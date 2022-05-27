import { FC, Fragment } from "react"
import { ISelectMenuItem } from "./selectMenuItem"
import Image from 'next/image'
import { CheckIcon } from '@heroicons/react/solid'
import { InformationCircleIcon } from '@heroicons/react/outline'

import { Listbox, Transition } from "@headlessui/react"

export interface SelectMenuOptionsProps {
    values: ISelectMenuItem[];
    name: string;
}

const disabledMEssages = {
    "RONIN_MAINNET": "binance message very long one this is just redicu louslya sdasdasd asdasddsa long message for binance us"
}

let SelectMenuOptions: FC<SelectMenuOptionsProps> = ({ values, name }): JSX.Element => {
    if (!values) {
        return <></>
    }
    console.log(values)
    return (<>

        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options className="ring-2 ring-gray-700 ring-opacity-60 absolute origin-top-right right-0 z-10 mt-2 x-1 w-full md:w-56 bg-gray-800 rounded-md py-1 overflow-hidden  focus:outline-none">
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
                                            className={`rounded-md object-contain ${disabled ? 'opacity-40' : ''}`}
                                        />
                                    </div>
                                    <div className={joinClassNames(selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate')}                                                    >
                                        <div className='inline group-hover'>{item.name}</div>
                                    </div>
                                    {
                                        disabled &&
                                        <>
                                            <div className="text-white relative inset-y-0 right-0 flex items-center px-4">
                                                <div className="relative flex flex-col items-center group">
                                                    <div className="min-w-fit absolute bottom-0 flex flex-col items-center hidden mb-3 ml-20 group-hover:flex">
                                                        <span className="leading-4 min z-10 p-2 text-xs text-white whitespace-no-wrap bg-gray-600 shadow-lg rounded-md">
                                                            {disabledMEssages[item.id] || "default message"}
                                                        </span>
                                                        <div className=" w-3 h-3 -mt-2 rotate-45 bg-gray-600"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-white absolute inset-y-0 right-0 flex items-center px-4">
                                                <InformationCircleIcon className="h-6 w-6 opacity-30" aria-hidden="true" />
                                            </div>
                                        </>


                                    }
                                </div>
                                {selected ? (
                                    <span className="text-white absolute inset-y-0 right-0 flex items-center px-4">
                                        <CheckIcon data-tooltip-target={`tooltip_${name}`} className="h-6 w-6" aria-hidden="true" />
                                    </span>
                                ) : null}
                            </>
                        )}
                    </Listbox.Option>
                ))}
            </Listbox.Options>
        </Transition>
    </>

    )
}

export default SelectMenuOptions;

function joinClassNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

function styleOption(active: boolean, disabled: boolean) {
    let classNames = 'cursor-pointer select-none relative py-2 m-1.5 rounded-md px-3 pr-9 group';
    if (disabled) {
        return 'text-gray-600 bg-gray-600 bg-disabledSelect cursor-not-allowed ' + classNames;
    }
    if (active) {
        return 'text-white bg-coolGray-700 ' + classNames;
    }
    else {
        return 'text-white ' + classNames;
    }
}