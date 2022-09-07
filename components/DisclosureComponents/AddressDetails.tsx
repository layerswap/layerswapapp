import { ChevronDownIcon, ExternalLinkIcon, PencilAltIcon } from '@heroicons/react/outline'
import { Disclosure } from "@headlessui/react";
import { useSwapDataState } from '../../context/swap';
import Image from 'next/dist/client/image';
import { FC, MouseEventHandler, useEffect } from 'react';
import shortenAddress from '../utils/ShortenAddress';
import { SwapFormValues } from '../DTOs/SwapFormValues';
import CopyButton from '../buttons/copyButton';

export class AddressDetailsProps {
    onClickEditAddress?: MouseEventHandler<HTMLButtonElement> | undefined;
    canEditAddress: boolean;
}

function constructExplorerUrl(swapFormData: SwapFormValues): string {
    return swapFormData?.network?.baseObject.account_explorer_template.replace("{0}", swapFormData?.destination_address.startsWith('zksync:') ? swapFormData?.destination_address.replace('zksync:', '') : swapFormData?.destination_address);
}

const AddressDetails: FC<AddressDetailsProps> = ({ onClickEditAddress: onClick, canEditAddress }) => {
    const { swapFormData } = useSwapDataState()

    if (swapFormData?.swapType === "offramp")
        return <>
            <div className="mx-auto w-full rounded-lg border border-darkblue-100 hover:border-darkblue-200 bg-darkblue-500 p-2">
                <div className="flex items-center min-w-0 flex-1">
                    {
                        swapFormData?.exchange?.imgSrc &&
                        <div className="flex-shrink-0 h-5 w-5 mr-2 relative">
                            <Image
                                src={swapFormData?.exchange?.imgSrc}
                                alt="Exchange Logo"
                                height="60"
                                width="60"
                                layout="responsive"
                                className="rounded-md object-contain"
                            />
                        </div>
                    }
                    {
                        <div className='flex min-w-0 flex-1 mr-1'>
                            <span className='text-base font-medium break-all'>
                                {swapFormData?.destination_address}
                            </span>
                        </div>
                    }
                </div>
            </div>
        </>

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


                                    <div className="flex items-center min-w-0 flex-1">
                                        {
                                            swapFormData?.network?.imgSrc &&
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
                                        }
                                        {
                                            open ?
                                                <div className='flex min-w-0 flex-1 mr-1' id='containerOfTextContainer'>
                                                    <span className='text-base font-medium' id='textContainer'>
                                                        {swapFormData?.destination_address}
                                                    </span>
                                                </div>
                                                :
                                                <p className='text-base font-medium'> {shortenAddress(swapFormData?.destination_address)}</p>
                                        }
                                    </div>

                                    <ChevronDownIcon
                                        className={`${open ? 'rotate-180 transform' : ''
                                            } h-4 w-4 text-primary-text`}
                                    />
                                </Disclosure.Button>
                                <Disclosure.Panel className="text-sm">
                                    <>
                                        <div className="flex items-center flex-wrap">
                                            <a className='m-1.5 flex text-primary-text cursor-pointer items-center hover:text-white' href={constructExplorerUrl(swapFormData)} target='_blank'  >
                                                <ExternalLinkIcon className='h-4 w-4 mr-2' />
                                                <p className=''>View In Explorer</p>
                                            </a>
                                            <button disabled={!canEditAddress} onClick={onClick} className="text-sm font-normal m-1.5 flex text-primary-text cursor-pointer items-center hover:text-white">
                                                <PencilAltIcon className='inline-block h-4 w-4 mr-2' />
                                                Edit Address
                                            </button>
                                            <div className='cursor-pointer text-primary-text hover:text-white flex items-center m-1.5'>
                                                <CopyButton toCopy={swapFormData?.destination_address}>
                                                    <span className='text-sm font-normal'>Copy Full Address</span>
                                                </CopyButton>
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