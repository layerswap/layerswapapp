import { XIcon } from "@heroicons/react/outline";
import { AnimatePresence, motion } from "framer-motion";
import React, { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { FC, useState } from "react"
import { MobileModalContent } from "./modalComponent";
import { Root, Portal, Overlay, Content, } from '@radix-ui/react-dialog';
import useWindowDimensions from "../hooks/useWindowDimensions";

export type slideOverPlace = 'inStep' | 'inModal' | 'inMenu'

type Props = {
    header?: string;
    opener?: (open: () => void) => JSX.Element | JSX.Element[],
    children?: (close: () => void) => JSX.Element | JSX.Element[];
    moreClassNames?: string;
    place: slideOverPlace | string
    imperativeOpener?: [isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>]
}

const SlideOver: FC<Props> = (({ header, opener, imperativeOpener, moreClassNames, place, children }) => {
    const [open, setOpen] = useState(false)
    const mobileModalRef = useRef(null)
    const { width } = useWindowDimensions()
    const handleClose = () => {
        setOpen(false)
        imperativeOpener?.[1](false);
    }
    const handleOpen = () => {
        setOpen(true)
        imperativeOpener?.[1](true);
    }

    switch (place) {
        case 'inStep':
            moreClassNames += " -mt-11";
            break;
        case 'inMenu':
            moreClassNames += " pt-2";
            break;
        case 'inModal':
            moreClassNames += " ";
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
                {open &&
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{
                            y: 0,
                            transition: { duration: 0.3, ease: [0.36, 0.66, 0.04, 1] },
                        }}
                        exit={{
                            y: "100%",
                            transition: { duration: 0.4, ease: [0.36, 0.66, 0.04, 1] },
                        }}
                        className={`absolute inset-0 z-40 w-full ${moreClassNames} hidden sm:block`}>
                        <div className='relative z-40 overflow-hidden flex flex-col rounded-t-2xl md:rounded-none bg-darkblue px-6 sm:px-8 h-full space-y-3 py-4'>
                            <div className="flex items-center justify-between text-primary-text cursor-pointer">
                                <p className="text-xl text-white font-semibold">
                                    {header}
                                </p>
                                <button
                                    type="button"
                                    className="rounded-md hover:text-darkblue-200"
                                    onClick={handleClose}
                                >
                                    <span className="sr-only">Close</span>
                                    <XIcon className="h-7 w-7" aria-hidden="true" />
                                </button>
                            </div>
                            <div className='text-primary-text relative items-center justify-center text-center h-full'>
                                {children && children(handleClose)}
                            </div>
                        </div>
                    </motion.div>
                }
            </AnimatePresence>
            <AnimatePresence>
                {open && width < 640 &&
                    <Root open={open} onOpenChange={() => { }} >
                        <Portal>
                            <Overlay />
                            <Content>
                                <MobileModalContent ref={mobileModalRef} showModal={open} setShowModal={setOpen} title={header}>
                                    {children && children(handleClose)}
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