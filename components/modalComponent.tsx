import { Dispatch, FC, PropsWithChildren, SetStateAction, useCallback, useEffect, useRef } from 'react'
import { Dialog } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline';
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { useQueryState } from '../context/query';
import { useRouter } from 'next/router';
import { forwardRef } from 'react';

type modalSize = 'small' | 'medium' | 'large';

class ModalParams {
    showModal: boolean;
    setShowModal: Dispatch<SetStateAction<boolean>>;
    closeWithX?: boolean;
    title?: React.ReactNode;
    className?: string;
    modalSize?: modalSize = "large";
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
    const desktopModalRef = useRef(null);
    const { key } = router.query;

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

    return (
        <AnimatePresence>
            {showModal && (
                <Dialog
                    static
                    className={`${query?.addressSource} relative z-40`}
                    onClose={() => setShowModal(false)}
                    open={showModal}
                    as={motion.div}>
                    <MobileModal showModal={showModal} setShowModal={setShowModal} title={title}>
                        {children}
                    </MobileModal>
                    <Dialog.Overlay>
                        <motion.div
                            key="backdrop"
                            className="fixed inset-0 z-20 bg-black/40 bg-opacity-10 hidden sm:block"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => closeModal(closeWithX)}
                        />
                    </Dialog.Overlay>
                    <motion.div
                        ref={desktopModalRef}
                        key="desktop-modal"
                        className={`fixed inset-0 z-30 hidden min-h-screen items-center justify-center sm:flex `}
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
                            <div className={`${className} space-y-2 bg-darkblue py-6 md:py-8 px-6 md:px-8 transform overflow-hidden rounded-md align-middle shadow-xl`}>
                                <Dialog.Title className='flex justify-between space-x-8'>
                                    <div className="text-lg text-left font-medium text-primary-text" >
                                        {title}
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md hover:text-darkblue-200 text-primary-text"
                                        onClick={() => {
                                            setShowModal(false);
                                        }}                                                >
                                        <span className="sr-only">Close</span>
                                        <XIcon className="h-7 w-7" aria-hidden="true" />
                                    </button>
                                </Dialog.Title>
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </Dialog>
            )}
        </AnimatePresence>
    );
}

export const MobileModal = forwardRef<HTMLDivElement, PropsWithChildren<ModalParams>>(({ showModal, setShowModal, children, title }, topmostRef) => {
    const mobileModalRef = useRef(null);
    const controls = useAnimation();
    const transitionProps = { type: "spring", stiffness: 500, damping: 42 };

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

    useEffect(() => {
        if (showModal) {
            controls.start({
                y: 0,
                transition: transitionProps,
            });
        }
    }, [showModal]);

    return (
        <div ref={topmostRef}>
            <motion.div
                key="backdrop"
                className="fixed inset-0 z-20 bg-black/40 bg-opacity-10 sm:hidden block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
            />
            <motion.div
                key="mobile-modal"
                ref={mobileModalRef}
                className={`group fixed overflow-x-auto inset-x-0 bottom-0 z-40 w-screen cursor-grab active:cursor-grabbing bg-darkblue px-6 rounded-t-2xl shadow-lg border-t border-darkblue-100 pb-6 sm:hidden`}
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
                <div tabIndex={0} className="h-7 rounded-t-4xl -mb-1 flex w-full items-center justify-center">
                    <div className="-mr-1 h-1 w-6 rounded-full bg-darkblue-100 transition-all group-active:rotate-12" />
                    <div className="h-1 w-6 rounded-full bg-darkblue-100 transition-all group-active:-rotate-12" />
                </div>
                <div className="text-lg text-center leading-6 font-medium text-primary-text mb-3">
                    {title}
                </div>
                <div className='inline-block max-w-screen-xl max-h-[calc(100vh-170px)] w-full transform overflow-scroll'>
                    {children}
                </div>
            </motion.div>
        </div>
    )
})

export default Modal;
