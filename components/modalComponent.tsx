import { FC, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline';

interface ModalParams {
    onDismiss: (isIntentional: boolean) => void;
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
}

const Modal: FC<ModalParams> = ({ onDismiss, isOpen, children, title, description }) => {

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-40" onClose={() => onDismiss(false)}>
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="py-6 md:py-8 w-fit max-w-xl transform overflow-hidden rounded-md bg-darkBlue align-middle shadow-xl transition-all">
                                <div>
                                    <Dialog.Title as="div" >
                                        <div className='flex justify-between space-x-8 px-6 md:px-8'>
                                            <div className="text-lg text-left leading-6 font-medium text-gray-300" >
                                                {title}
                                            </div>
                                            <button
                                                type="button"
                                                className="rounded-md text-darkblue-200  hover:text-pink-primary-300"
                                                onClick={() => {
                                                    onDismiss(true);
                                                }}                                                >
                                                <span className="sr-only">Close</span>
                                                <XIcon className="h-6 w-6" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </Dialog.Title>
                                    <div className="mt-8">
                                        <div className="text-sm text-gray-100 text-left">
                                            {description}
                                        </div>
                                    </div>
                                </div>
                                {children}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog >
        </Transition.Root >
    )
}

export default Modal;
