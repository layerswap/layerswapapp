import { Dispatch, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react'
import { motion, useAnimation } from "framer-motion";
import { forwardRef } from 'react';
import inIframe from '../utils/inIframe';
import IconButton from '../buttons/iconButton';
import { X } from 'lucide-react';

export type LeafletHeight = 'fit' | 'full' | '80%';

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
                className={`${height === 'full' ? 'h-full' : height === '80%' ? 'h-[80%]' : ''} group ${position} inset-x-0 bottom-0 z-40 w-full ${height != 'full' ? 'cursor-grab active:cursor-grabbing rounded-t-2xl border-t border-darkblue-500' : ''}  bg-darkblue-900 ${className} shadow-lg`}
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
                <div className={`py-3 flex flex-col h-full z-40 ${height != 'full' ? 'bg-darkblue-950 border-t border-darkblue-500 rounded-t-2xl ' : ''}  pb-6`}>
                    <div className='px-6 flex justify-between items-center'>
                        <div className="text-lg text-white font-semibold">
                            <div>{title}</div>
                        </div>
                        <IconButton onClick={handleCloseModal} icon={
                            <X strokeWidth={3} />
                        }>
                        </IconButton>
                    </div>
                    <div className={`max-h-full overflow-y-auto styled-scroll px-6 h-full`}>
                        {children}
                    </div>
                </div>

            </motion.div>
        </div>
    )
})
