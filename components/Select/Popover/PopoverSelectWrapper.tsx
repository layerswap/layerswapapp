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
    disabled
}: PopoverSelectWrapper) {
    const [showModal, setShowModal] = useState(false)

    const handleSelect = useCallback((item: SelectMenuItem<T>) => {
        setValue(item)
        setShowModal(false)
    }, [])

    return (
        disabled ?
            <div className="relative">
                <div className='w-full py-0 px-3 md:px-5 border-transparent bg-transparent font-semibold rounded-md'>
                    <span className="flex items-center">
                        <div className="flex-shrink-0 h-6 w-6 relative">
                            {
                                value?.imgSrc && <Image
                                    src={value?.imgSrc}
                                    alt="Project Logo"
                                    priority
                                    height="40"
                                    width="40"
                                    className="rounded-md object-contain"
                                />
                            }

                        </div>
                        <span className="ml-3 block truncate text-primary-text">{value?.name}</span>
                    </span>
                </div>
            </div>
            :
            <Popover open={showModal} onOpenChange={() => setShowModal(!showModal)}>
                <PopoverTrigger asChild>
                    {
                        value &&
                        <div className="relative">
                            <button type='button' className='w-full flex border-transparent bg-transparent font-semibold rounded-md'>
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
                                    <span className="ml-3 pointer-events-none text-primary-text">
                                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                </span>
                            </button>
                        </div>
                    }
                </PopoverTrigger>
                <PopoverContent className="w-fit">
                    <PopoverSelect setValue={handleSelect} value={value} values={values} />
                </PopoverContent>
            </Popover>
    )
}
