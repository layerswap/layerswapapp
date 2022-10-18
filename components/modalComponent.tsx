import { FC } from 'react'
import { Dialog } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline';
import { AnimatePresence, motion } from "framer-motion";
import { useQueryState } from '../context/query';

interface ModalParams {
    onDismiss: (isIntentional: boolean) => void;
    isOpen: boolean;
    title?: React.ReactNode;
    className?: string
}

const Modal: FC<ModalParams> = ({ onDismiss, isOpen, children, title, className }) => {
    const query = useQueryState()

    return (
        <AnimatePresence>
            {isOpen && <Dialog
                className={`${query?.partnerName} relative z-40`}
                onClose={() => onDismiss(false)}
                open={isOpen}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: 1,
                        transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                    }}
                    exit={{
                        opacity: 0,
                        transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
                    }}
                    className="fixed inset-0 flex min-h-full items-center justify-center bg-black/40">
                    <Dialog.Panel className={`${className} w-full max-w-xl`}>
                        <div className="space-y-4 bg-darkblue py-6 md:py-8 transform overflow-hidden rounded-md align-middle shadow-xl">
                            <Dialog.Title as="div" >
                                <div className='flex justify-between space-x-8 px-6 md:px-8'>
                                    <div className="text-lg text-left leading-6 font-medium text-primary-text" >
                                        {title}
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md text-darkblue-200 hover:text-primary-text"
                                        onClick={() => {
                                            onDismiss(true);
                                        }}                                                >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>
                            </Dialog.Title>
                            <div>
                                {children}
                            </div>
                        </div>
                    </Dialog.Panel>
                </motion.div>
            </Dialog >}
        </AnimatePresence>
    )
}

export default Modal;