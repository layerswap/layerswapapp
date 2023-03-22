import { XIcon } from "@heroicons/react/outline";
import { AnimatePresence, motion } from "framer-motion";
import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef } from "react";
import { FC, useState } from "react"
import { MobileModalContent, modalHeight } from "./modalComponent";
import useWindowDimensions from "../hooks/useWindowDimensions";
import { Content, Overlay, Portal, Root } from "@radix-ui/react-dialog";

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
                                <button
                                    type="button"
                                    className="rounded-md hover:text-darkblue-200"
                                    onClick={handleClose}
                                >
                                    <span className="sr-only">Close</span>
                                    <XIcon className="h-7 w-7" aria-hidden="true" />
                                </button>
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
                    <Root open={open} >
                        <Portal>
                            <Overlay />
                            <Content>
                                <MobileModalContent onAnimationCompleted={handleAnimationCompleted} modalHeight={modalHeight} ref={mobileModalRef} showModal={open} setShowModal={setOpen} title={header} description={subHeader} className={moreClassNames}>
                                    {children && children(handleClose, openAnimaionCompleted)}
                                </MobileModalContent>
                            </Content>
                        </Portal>
                    </Root>
                }
            </AnimatePresence>
        </>
    )
})
export default SlideOver;