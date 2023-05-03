import { useCallback, useState } from 'react'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { ISelectMenuItem, SelectMenuItem } from '../Shared/Props/selectMenuItem'
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover'
import PopoverSelect from './PopoverSelect'

type PopoverSelectWrapper = {
    setValue: (value: ISelectMenuItem) => void;
    values: ISelectMenuItem[];
    value: ISelectMenuItem;
    placeholder?: string;
    searchHint?: string;
}

export default function PopoverSelectWrapper<T>({
    setValue,
    value,
    values
}: PopoverSelectWrapper) {
    const [showModal, setShowModal] = useState(false)

    const handleSelect = useCallback((item: SelectMenuItem<T>) => {
        setValue(item)
        setShowModal(false)
    }, [])

    return (
        <Popover open={showModal} onOpenChange={()=> setShowModal(!showModal)}>
            <PopoverTrigger asChild>
                {
                    value &&
                    <div className="relative">
                        <button type='button' className='w-full py-0 pl-3 md:pl-5 pr-10 border-transparent bg-transparent font-semibold rounded-md'>
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
                        </button>
                    </div>
                }
            </PopoverTrigger>
            <PopoverContent className="w-[150px]">
                <PopoverSelect setValue={handleSelect} value={value} values={values} />
            </PopoverContent>
        </Popover>
    )

    // return (
    //     <>
    //         <div className="flex items-center relative">
    //             <button
    //                 type="button"
    //                 onClick={openModal}
    //                 disabled={disabled}
    //                 className="rounded-lg focus-peer:ring-primary focus-peer:border-darkblue-500 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 flex items-center text-left justify-bottom w-full pl-3 pr-2 py-2 bg-darkblue-700 font-semibold"
    //             >
    //                 <span className='flex grow text-left items-center'>
    //                     {
    //                         value && <div className="flex items-center">
    //                             <div className="flex-shrink-0 h-6 w-6 relative">
    //                                 {
    //                                     value.imgSrc && <Image
    //                                         src={value.imgSrc}
    //                                         alt="Project Logo"
    //                                         height="40"
    //                                         width="40"
    //                                         loading="eager"
    //                                         priority
    //                                         className="rounded-md object-contain"
    //                                     />
    //                                 }

    //                             </div>
    //                         </div>
    //                     }
    //                     {value
    //                         ?
    //                         <span className="ml-3 block font-medium text-white flex-auto items-center">
    //                             {value?.name}
    //                         </span>
    //                         :
    //                         <span className="ml-3 block font-medium text-primary-text flex-auto items-center">
    //                             {placeholder}
    //                         </span>}
    //                 </span>
    //                 <span className="ml-3 right-0 flex items-center pr-2 pointer-events-none  text-white">
    //                     <ChevronDown className="h-4 w-4" aria-hidden="true" />
    //                 </span>
    //             </button>
    //             <Listbox.Button className="w-full py-0 pl-3 md:pl-5 pr-10 border-transparent bg-transparent font-semibold rounded-md">
    //                 {
    //                     value &&
    //                     <>
    //                         <span className="flex items-center">
    //                             <div className="flex-shrink-0 h-6 w-6 relative">
    //                                 {
    //                                     value.imgSrc && <Image
    //                                         src={value.imgSrc}
    //                                         alt="Project Logo"
    //                                         priority
    //                                         height="40"
    //                                         width="40"
    //                                         className="rounded-md object-contain"
    //                                     />
    //                                 }

    //                             </div>
    //                             <span className="ml-3 block truncate text-white">{value.name}</span>
    //                         </span>

    //                         <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white">
    //                             <ChevronDown className="h-4 w-4" aria-hidden="true" />
    //                         </span>
    //                     </>
    //                 }
    //             </Listbox.Button>
    //         </div>
    //         <CommandSelect
    //             setShow={setShowModal}
    //             setValue={handleSelect}
    //             show={showModal}
    //             value={value}
    //             searchHint={searchHint}
    //             values={values}
    //         />
    //     </>
    // )
}
