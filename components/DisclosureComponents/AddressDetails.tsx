import { ChevronDownIcon, ExternalLinkIcon, PencilAltIcon } from '@heroicons/react/outline'
import { Disclosure } from "@headlessui/react";
import { useSwapDataState } from '../../context/swap';
import Image from 'next/dist/client/image';
import { FC, MouseEventHandler, useEffect } from 'react';
import shortenAddress from '../utils/ShortenAddress';
import CopyButton from '../buttons/copyButton';
import { SwapType } from '../../lib/layerSwapApiClient';
import SpinIcon from '../icons/spinIcon';

export class AddressDetailsProps {
    onClickEditAddress?: MouseEventHandler<HTMLButtonElement> | undefined;
    canEditAddress: boolean;
}

function constructExplorerUrl(account_explorer_template: string, address: string): string {
    return account_explorer_template.replace("{0}", address.startsWith('zksync:') ? address.replace('zksync:', '') : address);
}

const AddressDetails: FC<AddressDetailsProps> = ({ onClickEditAddress: onClick, canEditAddress }) => {
    const { swapFormData } = useSwapDataState()
    const { destination_address, network, exchange } = swapFormData

    if (!destination_address)
        return <div className="mx-auto w-full rounded-lg border border-darkblue-500 hover:border-darkblue-50 bg-darkblue-700 p-2">
            <div className="flex items-center min-w-0 flex-1">
                <SpinIcon className="animate-spin h-5 w-5" />
            </div>
        </div>

    return swapFormData?.swapType === SwapType.OffRamp ?
        <OffRampAddress address={destination_address} imgSrc={exchange?.imgSrc} />
        : <OnRampAddress address={destination_address}
            imgSrc={network?.imgSrc}
            account_explorer_template={network?.baseObject?.account_explorer_template}
            onClick={canEditAddress && onClick}
        />
}

const OffRampAddress = ({ imgSrc, address }: { imgSrc: string, address: string }) => {
    return <>
        <div className="mx-auto w-full rounded-lg border border-darkblue-500 hover:border-darkblue-50 bg-darkblue-700 p-2">
            <div className="flex items-center min-w-0 flex-1">
                {
                    imgSrc &&
                    <div className="flex-shrink-0 h-5 w-5 mr-2 relative">
                        <Image
                            src={imgSrc}
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
                            {address}
                        </span>
                    </div>
                }
            </div>
        </div>
    </>
}

const OnRampAddress = ({ imgSrc, address, account_explorer_template, onClick }: { imgSrc: string, address: string, account_explorer_template: string, onClick?: MouseEventHandler<HTMLButtonElement> | undefined; }) => {
    return <>
        <div className="mx-auto w-full rounded-lg border border-darkblue-500 hover:border-darkblue-50 bg-darkblue-700 p-2">
            <Disclosure>
                {({ open }) => {
                    if (typeof window !== 'undefined') {
                        const textContainer = document.getElementById("textContainer");
                        const containerOfTextContainer = document.getElementById("containerOfTextContainer");
                        useEffect(() => {
                            if (textContainer && containerOfTextContainer && open) {
                                var initialColor = window.getComputedStyle(textContainer).color;
                                textContainer.style.color = 'transparent';
                                const originalText = address;
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
                                        imgSrc &&
                                        <div className="flex-shrink-0 h-5 w-5 mr-1 relative">
                                            <Image
                                                src={imgSrc}
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
                                                    {address}
                                                </span>
                                            </div>
                                            :
                                            <p className='text-base font-medium'> {shortenAddress(address)}</p>
                                    }
                                </div>
                                <ChevronDownIcon
                                    className={`${open ? 'rotate-180 transform' : ''
                                        } h-4 w-4 text-primary-text`}
                                />
                            </Disclosure.Button>
                            <Disclosure.Panel className="text-sm text-primary-text">
                                <>
                                    <div className="flex items-center flex-wrap">
                                        <a className='m-1.5 flex cursor-pointer items-center hover:text-white' href={constructExplorerUrl(account_explorer_template, address)} target='_blank'  >
                                            <ExternalLinkIcon className='h-4 w-4 mr-2' />
                                            <p className=''>View In Explorer</p>
                                        </a>
                                        <button disabled={!onClick} onClick={onClick} className="text-sm font-normal m-1.5 flex cursor-pointer items-center hover:text-white">
                                            <PencilAltIcon className='inline-block h-4 w-4 mr-2' />
                                            Edit Address
                                        </button>
                                        <div className='cursor-pointer hover:text-white flex items-center m-1.5'>
                                            <CopyButton toCopy={address}>
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
}

export default AddressDetails;