import { AnimatePresence, motion } from "framer-motion";
import React, { Dispatch, ReactNode, SetStateAction, useEffect, useRef } from "react";
import { FC } from "react"
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { ReactPortal } from "../Wizard/Widget";
import { Leaflet, LeafletHeight } from "./leaflet";


export interface ModalProps {
    header?: ReactNode;
    subHeader?: string | JSX.Element
    children?: JSX.Element | JSX.Element[];
    className?: string;
    height?: LeafletHeight;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    isMenu?: boolean;
}

const Modal: FC<ModalProps> = (({ header, height, className, children, subHeader, show, setShow, isMenu }) => {
    const { isMobile, isDesktop } = useWindowDimensions()
console.log(isMenu,"height={height ?? 'full'}")
    const mobileModalRef = useRef(null)

    useEffect(() => {
        if (isMobile && show) {
            window.document.body.style.overflow = 'hidden'
        }
        return () => { window.document.body.style.overflow = '' }
    }, [show])

    return (
        <>
            <AnimatePresence>
                {show && (
                    <>
                        {isDesktop &&
                            <ReactPortal wrapperId={"widget_root"}>
                                <Leaflet position="absolute" height={height ?? 'full'} ref={mobileModalRef} show={show} setShow={setShow} title={header} description={subHeader} className={className} >
                                    {children}
                                </Leaflet>
                            </ReactPortal>
                        }
                        {
                            isMobile && !isMenu &&
                            <Leaflet position="fixed" height={'80%'} ref={mobileModalRef} show={show} setShow={setShow} title={header} description={subHeader} className={className}>
                                {children}
                            </Leaflet>
                        }
                        {
                            isMobile && isMenu &&
                            <Leaflet position="fixed" height={"full"} ref={mobileModalRef} show={show} setShow={setShow} title={header} description={subHeader} className={className}>
                                {children}
                            </Leaflet>
                        }
                    </>
                )}
            </AnimatePresence>
        </>
    )
})

export default Modal;