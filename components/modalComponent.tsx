import { Dispatch, FC, PropsWithChildren, SetStateAction, useCallback, useEffect, useRef } from 'react'
import { XIcon } from '@heroicons/react/outline';
import { AnimatePresence, motion, useAnimation } from "framer-motion";
import { useQueryState } from '../context/query';
import { useRouter } from 'next/router';
import { forwardRef } from 'react';
import { Root, Portal, Overlay, Content, Title, Close, } from '@radix-ui/react-dialog';
import inIframe from './utils/inIframe';

type modalSize = 'small' | 'medium' | 'large';
export type modalHeight = 'auto' | 'large';

class ModalParams {
    showModal: boolean;
    setShowModal: Dispatch<SetStateAction<boolean>>;
    closeWithX?: boolean;
    title?: React.ReactNode;
    className?: string;
    modalSize?: modalSize = "large";
    modalHeight?: modalHeight = "auto";
    onAnimationCompleted?: (def: any) => void
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

const Modal: FC<ModalParams> = ({ showModal, setShowModal, onAnimationCompleted, children, closeWithX, title, className, modalSize = 'large' }) => {
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
                <Root
                    onOpenChange={closeModal}
                    open={showModal}
                >
                    <Portal>
                        <Overlay />
                        <Content className={query?.addressSource}>
                            <MobileModalContent className={className} showModal={showModal} setShowModal={setShowModal} title={title}>
                                {children}
                            </MobileModalContent>
                            <motion.div
                                key="backdrop"
                                className="fixed inset-0  bg-black/60 bg-opacity-10 hidden sm:block"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => closeModal(closeWithX)}
                            />
                            <motion.div
                                onAnimationComplete={onAnimationCompleted}
                                ref={desktopModalRef}
                                key="desktop-modal"
                                className={`fixed inset-0 z-40 hidden min-h-screen items-center justify-center sm:flex`}
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
                                    <div className={`${className} space-y-3 min-h-[80%] bg-darkblue py-6 md:py-8 px-6 md:px-8 transform overflow-hidden rounded-md align-middle shadow-xl`}>
                                        <div className='flex justify-between space-x-8'>
                                            <Title className="text-lg text-left font-medium text-primary-text" >
                                                {title}
                                            </Title>
                                            <Close
                                                type="button"
                                                className="rounded-md hover:text-darkblue-200 text-primary-text" >
                                                <span className="sr-only">Close</span>
                                                <XIcon className="h-7 w-7" aria-hidden="true" />
                                            </Close>
                                        </div>
                                        {children}
                                    </div>
                                </div>
                            </motion.div>
                        </Content>
                    </Portal>
                </Root>
            )}
        </AnimatePresence>
    );
}

export const MobileModalContent = forwardRef<HTMLDivElement, PropsWithChildren<ModalParams>>(({ showModal, onAnimationCompleted, setShowModal, children, title, className, modalHeight }, topmostRef) => {
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

    const handleCloseModal = () => setShowModal(false)

    return (
        <div ref={topmostRef}>
            <motion.div
                key="backdrop"
                className="fixed inset-0 z-20 bg-black/50 sm:hidden block overflow-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseModal}
            />
            <motion.div
                key="mobile-modal"
                ref={mobileModalRef}
                className={`${modalHeight === 'large' ? 'min-h-[80%]' : ''} group fixed overflow-x-auto space-y-1 inset-x-0 bottom-0 z-40 w-screen rounded-t-2xl cursor-grab active:cursor-grabbing bg-darkblue ${className} shadow-lg border-t border-darkblue-100 pb-6 sm:hidden`}
                initial={{ y: "100%" }}
                animate={controls}
                exit={{ y: "100%" }}
                transition={transitionProps}
                drag="y"
                dragDirectionLock
                onDragEnd={handleDragEnd}
                dragElastic={{ top: 0, bottom: 1 }}
                dragConstraints={{ top: 0, bottom: 0 }}
                onAnimationComplete={onAnimationCompleted}
            >
                <div className='px-5 grid grid-cols-6 items-center py-3 rounded-t-2xl bg-darkblue'>
                    <button className='text-base text-gray-600 col-start-1 justify-self-start hover:text-gray-700' onClick={handleCloseModal}>
                        Close
                    </button>
                    {
                        title ?
                            <div className="text-center col-start-2 col-span-4 justify-self-center leading-5 font-medium text-primary-text">
                                {title}
                            </div>
                            :
                            <div tabIndex={0} className="rounded-t-4xl flex items-center col-start-2 col-span-4 justify-self-center">
                                <div className="-mr-1 h-0.5 w-7 rounded-full bg-primary-text transition-all group-active:rotate-12" />
                                <div className="h-0.5 w-7 rounded-full bg-primary-text transition-all group-active:-rotate-12" />
                            </div>
                    }
                </div>
                <div className={`${className?.includes('bg-[#181c1f]') ? 'px-0 !pb-0' : 'px-5'}  inline-block max-w-screen-xl max-h-[calc(100vh-170px)] h-max w-full transform overflow-y-auto ${inIframe() && 'styled-scroll'}`}>
                    {children}
                </div>
            </motion.div>
        </div>
    )
})

export default Modal;
