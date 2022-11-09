import { FC, useEffect, useRef } from 'react'
import { Dialog } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline';
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { useQueryState } from '../context/query';
import { FocusTrap } from '@headlessui/react';

type modalSize = 'small' | 'medium' | 'large';

class ModalParams {
    onDismiss: (isIntentional: boolean) => void;
    isOpen: boolean;
    title?: React.ReactNode;
    className?: string;
    modalSize?: modalSize = "large"
}

function constructModalSize(size: modalSize) {

    let defaultModalStyle = 'w-full'

    switch (size) {
        case 'large':
            defaultModalStyle += " max-w-xl";
            break;
        case 'medium':
            defaultModalStyle += " max-w-md";
            break;
        case 'small':
            defaultModalStyle += " max-w-xs";
            break;
    }
    return defaultModalStyle
}

const Modal: FC<ModalParams> = ({ onDismiss, isOpen, children, title, className, modalSize = 'large' }) => {
    const query = useQueryState()
    const mobileModalRef = useRef(null);
    const desktopModalRef = useRef(null);
    const controls = useAnimation();
    const transitionProps = { type: "spring", stiffness: 500, damping: 30 };
    useEffect(() => {
        controls.start({
            y: 0,
            transition: transitionProps,
        });
        console.log('plor')
    }, []);

    async function handleDragEnd(_, info) {
        const offset = info.offset.y;
        const velocity = info.velocity.y;
        const height = mobileModalRef.current.getBoundingClientRect().height;
        if (offset > height / 2 || velocity > 800) {
            await controls.start({ y: "100%", transition: transitionProps });
            onDismiss(true);
        } else {
            controls.start({ y: 0, transition: transitionProps });
        }
    }

    return (
        <AnimatePresence>
            {isOpen && <Dialog
                className={`${query?.addressSource} relative z-40`}
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
                    className="fixed inset-0 min-h-full items-center justify-center bg-black/40 hidden md:flex">
                    <Dialog.Panel className={constructModalSize(modalSize)}>
                        <div className={`${className} space-y-4 bg-darkblue py-6 md:py-8 px-6 md:px-8 transform overflow-hidden rounded-md align-middle shadow-xl`}>
                            <Dialog.Title as="div" >
                                <div className='flex justify-between space-x-8'>
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
                <motion.div
                    key="mobile-modal"
                    ref={mobileModalRef}
                    className="group fixed inset-x-0 bottom-0 z-40 w-screen cursor-grab active:cursor-grabbing bg-darkblue-800 px-6 rounded-t-2xl shadow-lg border-t border-darkblue-100 pb-6 sm:hidden"
                    initial={{ y: "100%" }}
                    animate={controls}
                    exit={{ y: "100%" }}
                    transition={transitionProps}
                    drag="y"
                    dragDirectionLock
                    onDragEnd={handleDragEnd}
                    dragElastic={{ top: 0, bottom: 1 }}
                    dragConstraints={{ top: 0, bottom: 0 }}
                >
                    <div className="h-7  rounded-t-4xl -mb-1 flex w-full items-center justify-center">
                        <div className="-mr-1 h-1 w-6 rounded-full bg-darkblue-100 transition-all group-active:rotate-12" />
                        <div className="h-1 w-6 rounded-full bg-darkblue-100 transition-all group-active:-rotate-12" />
                    </div>
                    {children}
                </motion.div>
            </Dialog >}
        </AnimatePresence>
    )
}

export default Modal;
