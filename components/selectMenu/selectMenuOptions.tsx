import { FC, Fragment } from "react"
import { ISelectMenuItem } from "./selectMenuItem"
import Image from 'next/image'
import { CheckIcon } from '@heroicons/react/solid'
import { Listbox, Transition} from "@headlessui/react"

export interface SelectMenuOptionsProps {
    values: ISelectMenuItem[];
}

let SelectMenuOptions: FC<SelectMenuOptionsProps> = ({ values }): JSX.Element => {
    return (
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Listbox.Options className="ring-2 ring-gray-700 ring-opacity-60 absolute z-10 mt-2 x-1 w-full bg-gray-800 rounded-md py-1 overflow-auto focus:outline-none">
                {values.map((item) => (
                    <Listbox.Option
                        key={item.id}
                        disabled={!item.isEnabled}
                        className={({ active, disabled }) =>
                            styleOption(active, disabled)
                        }
                        value={item}
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
                                            className="rounded-md object-contain"
                                        />
                                    </div>
                                    <div className={joinClassNames(selected ? 'font-semibold' : 'font-normal', 'ml-3 block truncate')}                                                    >
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
    )
}

export default SelectMenuOptions;

function joinClassNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

function styleOption(active: boolean, disabled: boolean) {
    let classNames = 'cursor-pointer select-none relative py-2 m-1.5 rounded-md px-3 pr-9 group';
    if (disabled) {
        return 'text-gray-400 bg-gray-600 cursor-not-allowed ' + classNames;
    }
    if (active) {
        return 'text-white bg-coolGray-700 ' + classNames;
    }
    else {
        return 'text-white ' + classNames;
    }
}