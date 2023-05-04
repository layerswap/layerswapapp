import { AnimatePresence, motion } from "framer-motion";
import React, { Dispatch, ReactNode, SetStateAction, useEffect, useRef } from "react";
import { FC } from "react"
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { ReactPortal } from "../Wizard/Widget";
import { Leaflet } from "./leaflet";

type ModalHeight = 'full' | 'fit';

export interface ModalProps {
    header?: ReactNode;
    subHeader?: string | JSX.Element
    children?: JSX.Element | JSX.Element[];
    className?: string;
    height?: ModalHeight;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
}

const Modal: FC<ModalProps> = (({ header, height, className, children, subHeader, show, setShow }) => {
    const { isMobile, isDesktop } = useWindowDimensions()

    const mobileModalRef = useRef(null)

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
                            isMobile &&
                            <Leaflet position="fixed" height={height == 'full' ? '90%' : 'fit'} ref={mobileModalRef} show={show} setShow={setShow} title={header} description={subHeader} className={className}>
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