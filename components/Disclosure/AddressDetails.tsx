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
import { FC, MouseEventHandler, useEffect } from 'react';
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
                    {({ open }) => {
                        if (typeof window !== 'undefined') {
                            const span = document.getElementById("span");
                            const div = document.getElementById("div");
                            useEffect(() => {
                                if (span && div && open) {
                                    var initialColor = window.getComputedStyle(span).color;
                                    span.style.color = 'transparent';
                                    const originalText = swapFormData?.destination_address;
                                    const textLength = originalText.length;
                                    let part1 = originalText;
                                    let part2 = originalText.substring(textLength - 5, textLength);

                                    while (span.clientWidth > div.clientWidth) {
                                        part1 = part1.substring(0, part1.length - 1);
                                        span.textContent = part1 + "..." + part2;
                                    }

                                    span.style.color = initialColor;
                                }
                            }, [span?.clientWidth, div?.clientWidth]);
                        }
                        return (
                            <>
                                <Disclosure.Button className="items-center min-w-0 flex w-full relative justify-between rounded-lg p-1.5 text-left text-base font-medium">
                                    {
                                        swapFormData?.exchange?.imgSrc &&
                                        <div className="flex items-stretch min-w-0 flex-1">
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
                                            {
                                                open ?
                                                    <div className='flex min-w-0 flex-1 mr-1' id='div'>
                                                        <span className='text-base font-medium' id='span'>
                                                            {swapFormData?.destination_address}
                                                        </span>
                                                    </div>
                                                    :
                                                    <p className='text-base font-medium'> {`${swapFormData?.destination_address?.substring(0, 5)}...${swapFormData?.destination_address?.substring(swapFormData?.destination_address?.length - 4, swapFormData?.destination_address?.length - 1)}`}</p>
                                            }
                                        </div>
                                    }
                                    <ChevronDownIcon
                                        className={`${open ? 'rotate-180 transform' : ''
                                            } h-4 w-4 text-pink-primary-300`}
                                    />
                                </Disclosure.Button>
                                <Disclosure.Panel className="p-1.5 text-sm">
                                    <>
                                        <div className="flex items-center flex-wrap space-y-1 sm:space-y-0 sm:space-x-5">
                                            <a href={swapFormData?.network?.baseObject.account_explorer_template.replace("{0}", swapFormData?.destination_address)} target='_blank' className='mr-5 sm:mr-0 flex text-pink-primary-300 cursor-pointer items-center hover:text-white' >
                                                <ExternalLinkIcon className='h-4 w-4 mr-2' />
                                                <p className=''>View In Explorer</p>
                                            </a>
                                            <div className='cursor-pointer text-pink-primary-300 mr-5 sm:mr-0 hover:text-white flex items-center '>
                                                <ClickTooltip text='Copied!'>
                                                    <div onClick={() => copyTextToClipboard(swapFormData?.destination_address)}>
                                                        <DuplicateIcon className='inline-block h-4 w-4 mr-2' />
                                                        <span className='text-sm font-normal'>Copy Full Address</span>
                                                    </div>
                                                </ClickTooltip>
                                            </div>
                                            <button onClick={onClick} className="text-sm font-normal flex text-pink-primary-300 cursor-pointer items-center hover:text-white">
                                                <PencilAltIcon className='inline-block h-4 w-4 mr-2' />
                                                Edit Address
                                            </button>
                                        </div>
                                    </>
                                </Disclosure.Panel>
                            </>
                        )
                    }}
                </Disclosure>
            </div>
        </>
    )
}

export default AddressDetails;