import { Dispatch, FC, SetStateAction, useCallback, useEffect, useRef } from 'react'
import { Dialog, FocusTrap } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline';
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { useQueryState } from '../context/query';
import { useRouter } from 'next/router';

type modalSize = 'small' | 'medium' | 'large';

class ModalParams {
    showModal: boolean;
    setShowModal: Dispatch<SetStateAction<boolean>>;
    closeWithX?: boolean;
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

const Modal: FC<ModalParams> = ({ showModal, setShowModal, children, closeWithX, title, className, modalSize = 'large' }) => {
    const query = useQueryState()
    const router = useRouter();
    const mobileModalRef = useRef(null);
    const desktopModalRef = useRef(null);
    const controls = useAnimation();
    const { key } = router.query;
    const transitionProps = { type: "spring", stiffness: 500, damping: 42 };

    const closeModal = useCallback(
        (closeWithX?: boolean) => {
            if (closeWithX) {
                return;
            } else if (key) {
                router.push("/");
            } else {
                setShowModal(false);
            }
        },
        [key, router, setShowModal],
    );

    useEffect(() => {
        if (showModal) {
            controls.start({
                y: 0,
                transition: transitionProps,
            });
        }
    }, [showModal]);

    async function handleDragEnd(_, info) {
        const offset = info.offset.y;
        const velocity = info.velocity.y;
        const height = mobileModalRef.current.getBoundingClientRect().height;
        if (offset > height / 2 || velocity > 800) {
            await controls.start({ y: "100%", transition: transitionProps });
            setShowModal(false);
        } else {
            controls.start({ y: 0, transition: transitionProps });
        }
    }

    return (
        <AnimatePresence>
            {showModal && (
                <Dialog
                    className={`${query?.addressSource} relative z-40`}
                    onClose={() => setShowModal(false)}
                    open={showModal}>
                    <Dialog.Overlay>
                        <motion.div
                            key="backdrop"
                            className="fixed inset-0 z-30 bg-black/40 bg-opacity-10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => closeModal(closeWithX)}
                        />
                    </Dialog.Overlay>
                    <motion.div
                        key="mobile-modal"
                        ref={mobileModalRef}
                        className={`group fixed inset-x-0 bottom-0 z-40 w-screen cursor-grab active:cursor-grabbing bg-darkblue px-6 rounded-t-2xl shadow-lg border-t border-darkblue-100 pb-6 sm:hidden`}
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
                        <Dialog.Panel>
                            <div className="h-7  rounded-t-4xl -mb-1 flex w-full items-center justify-center">
                                <div className="-mr-1 h-1 w-6 rounded-full bg-darkblue-100 transition-all group-active:rotate-12" />
                                <div className="h-1 w-6 rounded-full bg-darkblue-100 transition-all group-active:-rotate-12" />
                            </div>
                            <Dialog.Title className="text-lg text-center leading-6 font-medium text-primary-text mb-3">
                                {title}
                            </Dialog.Title>
                            {children}
                        </Dialog.Panel>
                    </motion.div>
                    <motion.div
                        ref={desktopModalRef}
                        key="desktop-modal"
                        className={`fixed inset-0 z-40 hidden min-h-screen items-center justify-center sm:flex `}
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: 1,
                            transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                        }}
                        exit={{
                            opacity: 0,
                            transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
                        }}
                        onMouseDown={(e) => {
                            if (desktopModalRef.current === e.target) {
                                closeModal(closeWithX);
                            }
                        }}
                    >
                        <div className={constructModalSize(modalSize)}>
                            <Dialog.Panel className={`${className} space-y-4 bg-darkblue py-6 md:py-8 px-6 md:px-8 transform overflow-hidden rounded-md align-middle shadow-xl`}>
                                <Dialog.Title className='flex justify-between space-x-8'>
                                    <div className="text-lg text-left leading-6 font-medium text-primary-text" >
                                        {title}
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md text-darkblue-200 hover:text-primary-text"
                                        onClick={() => {
                                            setShowModal(false);
                                        }}                                                >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </Dialog.Title>
                                {children}
                            </Dialog.Panel>
                        </div>
                    </motion.div>
                </Dialog>
            )}
        </AnimatePresence>
    );
}

export default Modal;
