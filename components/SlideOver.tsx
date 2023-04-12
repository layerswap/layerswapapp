import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { Dispatch, ReactNode, SetStateAction, useCallback, useEffect, useRef } from "react";
import { FC, useState } from "react"
import { MobileModalContent, modalHeight } from "./modalComponent";
import useWindowDimensions from "../hooks/useWindowDimensions";
import IconButton from "./buttons/iconButton";
import { ReactPortal } from "./Wizard/Widget";

export type slideOverPlace = 'inStep' | 'inModal' | 'inMenu'

type Props = {
    header?: ReactNode;
    subHeader?: string | JSX.Element
    opener?: (open: () => void) => JSX.Element | JSX.Element[],
    children?: (close: () => void, animaionCompleted?: boolean) => JSX.Element | JSX.Element[];
    moreClassNames?: string;
    place: slideOverPlace;
    noPadding?: boolean;
    hideHeader?: boolean;
    dismissible?: boolean;
    modalHeight?: modalHeight;
    withoutEnterAnimation?: boolean;
    openAnimationDelay?: number;
    imperativeOpener?: [isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>]
}

const SlideOver: FC<Props> = (({ header, opener, modalHeight, imperativeOpener, moreClassNames, place, noPadding, children, dismissible = true, subHeader, withoutEnterAnimation, openAnimationDelay = 0, hideHeader }) => {
    const [open, setOpen] = useState(imperativeOpener ? imperativeOpener?.[0] : false)
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
        return () => { window.document.body.style.overflow = '' }
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

    useEffect(() => {
        imperativeOpener && setOpen(imperativeOpener[0])
    }, [imperativeOpener?.[0]])

    useEffect(() => {
        if (open) imperativeOpener?.[1](true)
        else imperativeOpener?.[1](false)
    }, [open])

    return (
        <>
            {opener && opener(handleOpen)}
            <AnimatePresence>
                {open && !isMobile &&
                    <ReactPortal wrapperId={place === "inModal" ? "modal_slideover" : "wizard_slideover"}>
                        <motion.div
                            onAnimationComplete={handleAnimationCompleted}
                            initial={!withoutEnterAnimation && { y: "100%" }}
                            animate={{
                                y: 0,
                                transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1], delay: openAnimationDelay },
                            }}
                            exit={{
                                y: "100%",
                                transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                            }}
                            className={`absolute inset-0 z-40 w-full hidden sm:block`}>
                            <div className={`relative z-40 flex flex-col rounded-t-2xl md:rounded-none bg-darkblue-900 h-full ${hideHeader ? 'py-6 space-y-3' : 'space-y-5 pb-6'}`}>
                                {
                                    !hideHeader && <div className={`flex items-center justify-between border-b-2 border-darkblue-600 text-primary-text px-6 sm:px-8 py-3`}>
                                        <div className="text-xl text-white font-semibold">
                                            <div>{header}</div>
                                            {
                                                subHeader &&
                                                <div className="text-lg text-primary-text font-normal leading-6 mt-1">
                                                    {subHeader}
                                                </div>
                                            }
                                        </div>
                                        {
                                            dismissible && <IconButton onClick={handleClose} icon={
                                                <X strokeWidth={3} />
                                            }>
                                            </IconButton>
                                        }
                                    </div>
                                }
                                <div className={`text-primary-text relative items-center justify-center text-center h-full overflow-y-auto styled-scroll ${!noPadding ? 'px-6 sm:px-8' : ''}`}>
                                    {children && children(handleClose, openAnimaionCompleted)}
                                </div>
                            </div>
                        </motion.div>
                    </ReactPortal>
                }
            </AnimatePresence>
            <AnimatePresence>
                {open && isMobile &&
                    <ReactPortal>
                        <MobileModalContent modalHeight={modalHeight} ref={mobileModalRef} showModal={open} setShowModal={setOpen} title={header} description={subHeader} dismissible={dismissible} className={moreClassNames} openAnimationDelay={openAnimationDelay}>
                            {children && children(handleClose)}
                        </MobileModalContent>
                    </ReactPortal>
                }
            </AnimatePresence>
        </>
    )
})

export default SlideOver;