import { useCallback, useState } from 'react'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { ISelectMenuItem, SelectMenuItem } from '../Shared/Props/selectMenuItem'
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover'
import PopoverSelect from './PopoverSelect'

type PopoverSelectWrapper = {
    setValue: (value: ISelectMenuItem) => void;
    values: ISelectMenuItem[];
    value?: ISelectMenuItem;
    placeholder?: string;
    searchHint?: string;
    disabled?: boolean
}

export default function PopoverSelectWrapper<T>({
    setValue,
    value,
    values,
    disabled,
    placeholder
}: PopoverSelectWrapper) {
    const [showModal, setShowModal] = useState(false)

    const handleSelect = useCallback((item: SelectMenuItem<T>) => {
        setValue(item)
        setShowModal(false)
    }, [])

    return (
        value ?
            <>
                {
                    // disabled ?
                        // <div className="relative">
                        //     <div className='w-full py-0 px-3 md:px-5  border-transparent bg-transparent font-semibold rounded-md'>
                        //         <span className="flex items-center">
                        //             <div className="flex-shrink-0 h-6 w-6 relative">
                        //                 {
                        //                     value?.imgSrc && <Image
                        //                         src={value?.imgSrc}
                        //                         alt="Project Logo"
                        //                         priority
                        //                         height="40"
                        //                         width="40"
                        //                         className="rounded-md object-contain"
                        //                     />
                        //                 }

                        //             </div>
                        //             <span className="ml-3 block truncate text-primary-text">{value?.name}</span>
                        //         </span>
                        //     </div>
                        // </div>
                        // :
                        <Popover open={showModal} onOpenChange={() => setShowModal(!showModal)}>
                            <PopoverTrigger placeholder={placeholder} asChild>
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
                                            <span className="ml-3 block truncate text-primary-text">{value.name}</span>
                                        </span>

                                        <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-primary-text">
                                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                    </button>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-fit">
                                <PopoverSelect setValue={handleSelect} value={value} values={values} />
                            </PopoverContent>
                        </Popover>
                }
            </>
            :
            <div className="flex items-center relative">
                <div className="disabled:cursor-not-allowed relative grow flex items-center text-left w-full pl-3 pr-2 font-semibold">
                    <span className="flex grow text-left items-center">
                        <span className="block font-medium text-primary-text-placeholder flex-auto items-center">
                            {placeholder}
                        </span>
                    </span>
               
                </div>
            </div>

    )
}
