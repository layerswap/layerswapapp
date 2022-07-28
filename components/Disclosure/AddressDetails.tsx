import { ChevronDownIcon, DocumentDuplicateIcon, ExternalLinkIcon, PencilAltIcon } from '@heroicons/react/outline'
import { Disclosure } from "@headlessui/react";
import { useSwapDataState } from '../../context/swap';
import Image from 'next/dist/client/image';
import { copyTextToClipboard } from '../../lib/copyToClipboard';
import { FC, MouseEventHandler, useEffect } from 'react';
import ClickTooltip from '../Tooltips/ClickTooltip';
import shortenAddress from '../ShortenAddress';

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
                            const textContainer = document.getElementById("textContainer");
                            const containerOfTextContainer = document.getElementById("containerOfTextContainer");
                            useEffect(() => {
                                if (textContainer && containerOfTextContainer && open) {
                                    var initialColor = window.getComputedStyle(textContainer).color;
                                    textContainer.style.color = 'transparent';
                                    const originalText = swapFormData?.destination_address;
                                    const textLength = originalText.length;
                                    let part1 = originalText;
                                    let part2 = originalText.substring(textLength - 5, textLength);

                                    while (textContainer.clientWidth > containerOfTextContainer.clientWidth) {
                                        part1 = part1.substring(0, part1.length - 1);
                                        textContainer.textContent = part1 + "..." + part2;
                                    }

                                    textContainer.style.color = initialColor;
                                }
                            }, [textContainer?.clientWidth, containerOfTextContainer?.clientWidth]);
                        }
                        return (
                            <>
                                <Disclosure.Button className="items-center min-w-0 flex w-full relative justify-between rounded-lg p-1.5 text-left text-base font-medium">
                                    {
                                        swapFormData?.exchange?.imgSrc &&
                                        <div className="flex items-center min-w-0 flex-1">
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
                                                    <div className='flex min-w-0 flex-1 mr-1' id='containerOfTextContainer'>
                                                        <span className='text-base font-medium' id='textContainer'>
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
                                <Disclosure.Panel className="text-sm">
                                    <>
                                        <div className="flex items-center flex-wrap">
                                            <a className='m-1.5 flex text-pink-primary-300 cursor-pointer items-center hover:text-white' href={swapFormData?.network?.baseObject.account_explorer_template.replace("{0}", swapFormData?.destination_address)} target='_blank'  >
                                                <ExternalLinkIcon className='h-4 w-4 mr-2' />
                                                <p className=''>View In Explorer</p>
                                            </a>
                                            <button onClick={onClick} className="text-sm font-normal m-1.5 flex text-pink-primary-300 cursor-pointer items-center hover:text-white">
                                                <PencilAltIcon className='inline-block h-4 w-4 mr-2' />
                                                Edit Address
                                            </button>
                                            <div className='cursor-pointer text-pink-primary-300 hover:text-white flex items-center m-1.5'>
                                                <ClickTooltip text='Copied!'  moreClassNames='-right-1 bottom-3'>
                                                    <div onClick={() => copyTextToClipboard(swapFormData?.destination_address)}>
                                                        <DocumentDuplicateIcon className='inline-block h-4 w-4 mr-2' />
                                                        <span className='text-sm font-normal'>Copy Full Address</span>
                                                    </div>
                                                </ClickTooltip>
                                            </div>
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