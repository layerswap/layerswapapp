import { ChevronDownIcon, DuplicateIcon, ExternalLinkIcon, InformationCircleIcon, PencilAltIcon } from '@heroicons/react/outline'
import { Disclosure, Popover } from "@headlessui/react";
import Tooltip from '../Tooltips/tooltip';
import { SwapFormValues } from '../DTOs/SwapFormValues';
import { useSwapDataState } from '../../context/swap';
import { Currency } from '../../Models/Currency';
import { Exchange } from '../../Models/Exchange';
import Image from 'next/dist/client/image';
import { copyTextToClipboard } from '../../lib/copyToClipboard';
import SubmitButton from '../buttons/submitButton';
import { FC, MouseEventHandler } from 'react';
import ClickTooltip from '../Tooltips/ClickTooltip';

export class AddressDetailsProps {
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;
}


const AddressDetails: FC<AddressDetailsProps> = ({ onClick }) => {

    const { swapFormData } = useSwapDataState()

    return (
        <>
            <div className="mx-auto w-full rounded-lg border border-darkblue-100 hover:border-darkblue-200 bg-darkblue-500 p-2">
                <Disclosure>
                    {({ open }) => (
                        <>
                            <Disclosure.Button className="items-center flex w-full relative justify-between rounded-lg p-1.5 text-left text-base font-medium">
                                <span className="font-medium text-pink-primary-300">
                                    {
                                        swapFormData?.exchange?.imgSrc &&
                                        <div className="flex items-center">
                                            <div className='text-w '>
                                                <span className="flex">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-5 w-5 mr-1 relative">
                                                            <Image
                                                                src={swapFormData?.network?.imgSrc}
                                                                alt="Exchange Logo"
                                                                height="60"
                                                                width="60"
                                                                layout="responsive"
                                                                className="rounded-md object-contain"
                                                            />
                                                        </div>
                                                        <p className='text-base font-medium'> {`${swapFormData?.destination_address?.substring(0, 5)}...${swapFormData?.destination_address?.substring(swapFormData?.destination_address?.length - 4, swapFormData?.destination_address?.length - 1)}`}</p>
                                                    </div>
                                                </span>
                                            </div>
                                        </div>
                                    }
                                </span>
                                <ChevronDownIcon
                                    className={`${open ? 'rotate-180 transform' : ''
                                        } h-4 w-4 text-pink-primary-300`}
                                />
                            </Disclosure.Button>
                            <Disclosure.Panel className="p-1.5 text-sm">
                                <>
                                    <div className="flex items-center flex-wrap space-y-1 md:space-y-0 md:space-x-5">
                                        <a href={swapFormData?.network?.baseObject.account_explorer_template} target='_blank' className='mr-5 md:mr-0 flex text-pink-primary-300 cursor-pointer items-center hover:text-white' >
                                            <ExternalLinkIcon className='h-4 w-4 mr-2' />
                                            <p className=''>View In Explorer</p>
                                        </a>
                                        <div className='cursor-pointer text-pink-primary-300 hover:text-white block items-center'>
                                            <ClickTooltip text='Copied!'>
                                                <div onClick={() => copyTextToClipboard(swapFormData?.destination_address)}>
                                                    <DuplicateIcon className='inline-block h-4 w-4 mr-2' />
                                                    <span className='text-sm font-normal'>Copy Full Address</span>
                                                </div>
                                            </ClickTooltip>
                                        </div>
                                        <button onClick={onClick} className="text-sm font-normal md:inline-block text-pink-primary-300 cursor-pointer items-center hover:text-white">
                                            <PencilAltIcon className='inline-block h-4 w-4 mr-2' />
                                            Edit Address
                                        </button>
                                    </div>
                                </>
                            </Disclosure.Panel>
                        </>
                    )}
                </Disclosure>
            </div>
        </>
    )
}

export default AddressDetails;