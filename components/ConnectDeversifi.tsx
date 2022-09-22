import { FC, useState, Fragment } from 'react'
import Modal from './modalComponent';
import SubmitButton from './buttons/submitButton';
import { ExternalLinkIcon, ExclamationIcon, XIcon, LinkIcon } from '@heroicons/react/outline';
import { Combobox, Transition } from '@headlessui/react';
import { SwapFormValues } from './DTOs/SwapFormValues';

type Props = {
    isOpen: boolean,
    swapFormData: SwapFormValues,
    onClose: () => void
}

const ConnectDeversifi: FC<Props> = ({ isOpen, swapFormData, onClose }) => {
    const [loading, setLoading] = useState(false)

    const connectButtonIcon = <LinkIcon className='h-5 w-5'></LinkIcon>
    
    const modalDescription = () => {
        return (
            <div className='text-base'>
                <span>
                    DeversiFi account with the provided address does not exist. To create one, go to DeversiFi and connect your wallet.
                </span>
            </div>)
    }

    const exernalLinkIcon = <ExternalLinkIcon className='h-5 w-5'></ExternalLinkIcon>

    return (
        <Transition
            appear
            show={isOpen}
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full">
            <div className='absolute inset-0 z-40 -inset-y-11 flex flex-col w-full bg-darkblue'>
                <div className='relative z-40 overflow-hidden bg-darkblue p-4 pt-0'>
                    <div className='relative grid grid-cols-1 gap-4 place-content-end z-40 mb-2 mt-1'>
                        <span className="justify-self-end text-primary-text cursor-pointer">
                            <div className="hidden sm:block ">
                                <button
                                    type="button"
                                    className="rounded-md text-darkblue-200 hover:text-primary-text"
                                    onClick={onClose}
                                >
                                    <span className="sr-only">Close</span>
                                    <XIcon className="h-6 w-6" aria-hidden="true" />
                                </button>
                            </div>
                        </span>
                    </div>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="relative inset-0" ></div>
                    </Transition.Child>

                    <div className="relative inset-0 flex flex-col overflow-y-auto scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
                        <div className="relative min-h-full items-center justify-center p-4 pt-0 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95">
                                <Combobox
                                    as="div"
                                    className="transform  transition-all "
                                    onChange={() => { }}
                                    value=""
                                >
                                    <h3 className='mb-4 pt-2 text-xl text-center md:text-left font-roboto text-white font-semibold'>
                                        DeversiFi connect
                                        <p className='mb-10 pt-2 text-base text-center md:text-left font-roboto text-primary-text font-light'>
                                            DeversiFi account with the provided address does not exist. To create one, go to DeversiFi and connect your wallet.                                            
                                        </p>
                                    </h3>

                                    <div className="mt-3 sm:mt-6 text-white text-sm">
                                        <SubmitButton icon={connectButtonIcon} isDisabled={loading} isSubmitting={loading} onClick={() =>  window.open('https://app.deversifi.com/', '_blank')}>
                                            Connect
                                        </SubmitButton>
                                    </div>

                                </Combobox>

                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </div>

        </Transition>
    )
}

export default ConnectDeversifi;