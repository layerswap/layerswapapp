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
}
