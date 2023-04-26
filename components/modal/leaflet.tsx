import { Dispatch, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react'
import { motion, useAnimation } from "framer-motion";
import { forwardRef } from 'react';
import inIframe from '../utils/inIframe';

export type LeafletHeight = 'fit' | 'full' | '90%';

// Relative gives the div a relative position allowing the parent to put it inside a React Portal. Appwide makes it fixed, so it renders on top of the app.
export type LeafletPosition = 'absolute' | 'fixed';

export interface LeafletProps {
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    title?: React.ReactNode;
    description?: JSX.Element | string;
    className?: string;
    height?: LeafletHeight;
    position: LeafletPosition;
}

export const Leaflet = forwardRef<HTMLDivElement, PropsWithChildren<LeafletProps>>(({ show, setShow, children, title, className, height, description, position }, topmostRef) => {
    const mobileModalRef = useRef(null);
    const controls = useAnimation();
    const transitionProps = { type: "spring", stiffness: 500, damping: 33 };

    async function handleDragEnd(_, info) {
        const offset = info.offset.y;
        const velocity = info.velocity.y;
        const height = mobileModalRef.current.getBoundingClientRect().height;
        if (offset > height / 2 || velocity > 800) {
            await controls.start({ y: "100%", transition: transitionProps, });
            setShow(false);
        } else {
            controls.start({ y: 0, transition: transitionProps });
        }
    }

    useEffect(() => {
        if (show) {
            controls.start({
                y: 0,
                transition: transitionProps,
            });
        }
    }, [show]);

    const handleCloseModal = () => {
        setShow(false)
    }

    return (
        <div ref={topmostRef}>
            <motion.div
                key="backdrop"
                className={`${position} inset-0 z-20 bg-black/50 block`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseModal}
            />
            <motion.div
                key="mobile-modal"
                ref={mobileModalRef}
                className={`${height === 'full' ? 'h-full' : height === '90%' ? 'h-[90%]': ''} group ${position} inset-x-0 bottom-0 z-40 w-full ${height != 'full' ? 'cursor-grab active:cursor-grabbing rounded-t-2xl border-t border-darkblue-500' : ''}  bg-darkblue-900 ${className} shadow-lg`}
                initial={{ y: "20%" }}
                animate={controls}
                exit={{ y: "100%" }}
                transition={transitionProps}
                drag={height != 'full' ? "y" : false}
                dragDirectionLock
                onDragEnd={handleDragEnd}
                dragElastic={{ top: 0, bottom: 1 }}
                dragConstraints={{ top: 0, bottom: 0 }}
            >
                <div className={`py-3 flex flex-col h-full z-40 ${height != 'full' ? 'bg-darkblue-950 border-t border-darkblue-500 rounded-t-2xl ' : ''}  space-y-5 pb-6`}>
                    <div className='px-5'>
                        <div className='grid grid-cols-6 items-center'>
                            {
                                title &&
                                <button tabIndex={-1} className='text-base text-primary col-start-1 justify-self-start hover:text-gray-700' onClick={handleCloseModal}>
                                    Close
                                </button>
                            }
                            {
                                title ?
                                    <div tabIndex={-1} className="text-center col-start-2 col-span-4 justify-self-center leading-5 font-medium text-white">
                                        {title}
                                    </div>
                                    :
                                    <div tabIndex={-1} className="rounded-t-4xl flex items-center col-start-2 col-span-4 justify-self-center">
                                        <div className="-mr-1 h-0.5 w-7 rounded-full bg-primary-text transition-all group-active:rotate-12" />
                                        <div className="h-0.5 w-7 rounded-full bg-primary-text transition-all group-active:-rotate-12" />
                                    </div>
                            }
                        </div>
                        {
                            description &&
                            <div className='text-primary-text opacity-70 flex justify-center'>
                                {description}
                            </div>
                        }
                    </div>
                    <div className={`max-h-full overflow-y-auto styled-scroll px-5`}>
                        {children}
                    </div>
                </div>

            </motion.div>
        </div>
    )
})
