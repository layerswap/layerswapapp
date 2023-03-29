import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef } from "react";
import { FC, useState } from "react"
import { MobileModalContent, modalHeight } from "./modalComponent";
import useWindowDimensions from "../hooks/useWindowDimensions";
import IconButton from "./buttons/iconButton";
import { ReactPortal } from "./Wizard/Widget";

export type slideOverPlace = 'inStep' | 'inModal' | 'inMenu'

type Props = {
    header?: string;
    subHeader?: string | JSX.Element
    opener?: (open: () => void) => JSX.Element | JSX.Element[],
    children?: (close: () => void, animaionCompleted?: boolean) => JSX.Element | JSX.Element[];
    moreClassNames?: string;
    place: slideOverPlace;
    noPadding?: boolean;
    modalHeight?: modalHeight;
    withoutEnterAnimation?: boolean;
    imperativeOpener?: [isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>]
}

const SlideOver: FC<Props> = (({ header, opener, modalHeight, imperativeOpener, moreClassNames, place, noPadding, children, subHeader, withoutEnterAnimation }) => {
    const [open, setOpen] = useState(false)
    const [openAnimaionCompleted, setOpenAnimationCompleted] = useState(false)
    const { width } = useWindowDimensions()
    const isMobile = width <= 640

    const bodyOverflowChanged = useRef<boolean>(open);
    useEffect(() => {
        if (!isMobile) return
        
        if (open) {
            bodyOverflowChanged.current = true;
            window.document.body.style.overflow = 'hidden'
        }
        else if (bodyOverflowChanged?.current) {
            window.document.body.style.overflow = ''
        }
    }, [open, isMobile])

    const mobileModalRef = useRef(null)
    const handleClose = () => {
        setOpen(false)
        setOpenAnimationCompleted(false)
        imperativeOpener?.[1](false);
    }
    const handleOpen = () => {
        setOpen(true)
        imperativeOpener?.[1](true);
    }
    const handleAnimationCompleted = useCallback((def) => {
        setOpenAnimationCompleted(def?.y === 0)
    }, [])
    let heightControl = ''

    switch (place) {
        case 'inStep':
            heightControl += " -mt-11";
            break;
        case 'inMenu':
            heightControl += " pt-2";
            break;
        case 'inModal':
            heightControl += " ";
            break;
    }

    useEffect(() => {
        imperativeOpener && setOpen(imperativeOpener[0])
    }, [imperativeOpener?.[0]])

    useEffect(() => {
        if (open) imperativeOpener?.[1](true)
        else imperativeOpener?.[1](false)
    }, [open])

    return (
        <>
            <span>{opener && opener(handleOpen)}</span>
            <AnimatePresence>
                {open && !isMobile &&
                    <motion.div
                        onAnimationComplete={handleAnimationCompleted}
                        initial={!withoutEnterAnimation && { y: "100%" }}
                        animate={{
                            y: 0,
                            transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
                        }}
                        exit={{
                            y: "100%",
                            transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                        }}
                        className={`absolute inset-0 z-40 w-full ${heightControl} block`}>
                        <div className={`relative z-40 flex flex-col rounded-t-2xl md:rounded-none bg-darkblue h-full space-y-3 py-4 ${!noPadding && 'px-6 sm:px-8'}`}>
                            <div className={`flex items-center justify-between text-primary-text ${noPadding && 'px-6 sm:px-8'}`}>
                                <div className="text-xl text-white font-semibold">
                                    <p>{header}</p>
                                    <div className="text-base text-primary-text font-medium leading-4">
                                        {subHeader}
                                    </div>
                                </div>
                                <IconButton onClick={handleClose} icon={
                                    <X strokeWidth={3} />
                                }>
                                </IconButton>
                            </div>
                            <div className='text-primary-text relative items-center justify-center text-center h-full overflow-y-auto styled-scroll'>
                                {children && children(handleClose, openAnimaionCompleted)}
                            </div>
                        </div>
                    </motion.div>
                }
            </AnimatePresence>
            <AnimatePresence>
                {open && isMobile &&
                    <ReactPortal>
                        <MobileModalContent modalHeight={modalHeight} ref={mobileModalRef} showModal={open} setShowModal={setOpen} title={header} className={moreClassNames}>
                            {children && children(handleClose)}
                        </MobileModalContent>
                    </ReactPortal>
                }
            </AnimatePresence>
        </>
    )
})

export default SlideOver;