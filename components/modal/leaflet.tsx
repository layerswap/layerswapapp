import { Dispatch, PropsWithChildren, SetStateAction, useCallback, useEffect, useRef } from 'react'
import { motion, useAnimation } from "framer-motion";
import { forwardRef } from 'react';
import IconButton from '../buttons/iconButton';
import { X } from 'lucide-react';

export type LeafletHeight = 'fit' | 'full' | '80%' | '90%';

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
    onClose?: () => void;
}
// TODO handle overflow when height is set to 'fit'
export const Leaflet = forwardRef<HTMLDivElement, PropsWithChildren<LeafletProps>>(function Leaflet({ show, setShow, onClose, children, title, className, height, description, position }, topmostRef) {
    const mobileModalRef = useRef<HTMLDivElement>(null);
    const controls = useAnimation();
    const transitionProps = { type: "spring", stiffness: 500, damping: 40 };

    const closeModal = useCallback(() => {
        setShow(false);
        onClose && onClose()
    }, [setShow, onClose])

    async function handleDragEnd(_, info) {
        const offset = info.offset.y;
        const velocity = info.velocity.y;
        const height = mobileModalRef.current?.getBoundingClientRect().height || 0;
        if (offset > height / 2 || velocity > 800) {
            await controls.start({ y: "100%", transition: transitionProps, });
            closeModal()
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
    }, [controls, show, transitionProps]);

    let wrapperHeightClass = ''
    switch (height) {
        case 'full':
            wrapperHeightClass = 'h-full'
            break;
        case '90%':
            wrapperHeightClass = 'h-[90%]'
            break;
        case '80%':
            wrapperHeightClass = 'h-[80%]'
            break;
        default:
            wrapperHeightClass = ''
    }

    return (
        <div ref={topmostRef}>
            <motion.div
                key="backdrop"
                className={`${position} asdasdasdaasdsddd inset-0 z-40 bg-black/50 block`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
            />
            <motion.div
                key="mobile-modal"
                ref={mobileModalRef}
                className={`${wrapperHeightClass} max-h-full overflow-y-auto group ${position} inset-x-0 bottom-0 z-40 w-full ${height != 'full' ? 'rounded-t-2xl border-t border-secondary-500' : ''}  bg-secondary-900 ${className} shadow-lg`}
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
                <div className={`py-3 flex flex-col h-full z-40 ${height != 'full' ? 'bg-secondary-900 border-t border-secondary-500 rounded-t-2xl ' : ''} pb-6`}>
                    <div className='px-6 flex justify-between items-center pb-2'>
                        <div className="text-lg text-primary-text font-semibold">
                            <div>{title}</div>
                        </div>
                        <IconButton onClick={closeModal} icon={
                            <X strokeWidth={3} />
                        }>
                        </IconButton>
                    </div>
                    <div className='select-text max-h-full overflow-y-auto styled-scroll px-6 h-full'>
                        {children}
                    </div>
                </div>
            </motion.div>
        </div>
    )
})
