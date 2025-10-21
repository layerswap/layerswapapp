import React, { Dispatch, ReactNode, SetStateAction, useEffect, useRef, useState } from "react";
import { FC } from "react"
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { Leaflet, LeafletHeight } from "./leaflet";
import ReactPortal from "../Common/ReactPortal";

export interface ModalProps {
    header?: ReactNode;
    subHeader?: string | JSX.Element
    children?: JSX.Element | JSX.Element[];
    className?: string;
    height?: LeafletHeight;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    modalId: string;
    onClose?: () => void;
    walletComp?: React.ReactNode;
}

const Modal: FC<ModalProps> = (({ header, height, className, children, subHeader, show, setShow, modalId, onClose, walletComp }) => {
    const { isMobile, isDesktop } = useWindowDimensions()
    const mobileModalRef = useRef(null)
    //Fixes draggebles closing
    const [delayedShow, setDelayedShow] = useState<boolean>()

    useEffect(() => {
        setDelayedShow(show)
    }, [show])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && delayedShow) {
                setShow(false);
                onClose && onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [delayedShow, onClose]);

    return (
        <>
            {isDesktop && (
                <ReactPortal wrapperId="widget">
                    {delayedShow &&
                        <Leaflet
                            key={modalId}
                            position="absolute"
                            height={height ?? 'full'}
                            show={delayedShow}
                            setShow={setShow}
                            title={header}
                            description={subHeader}
                            className={className}
                            onClose={onClose}
                            walletComp={walletComp}
                        >
                            {children}
                        </Leaflet>
                    }
                </ReactPortal>
            )}
            {isMobile && delayedShow && (
                <Leaflet
                    position="fixed"
                    height={height == 'full' ? '80%' : height == 'fit' ? 'fit' : (height == '80%' || height == '90%') ? height : 'full'}
                    ref={mobileModalRef}
                    show={delayedShow}
                    setShow={setShow}
                    title={header}
                    description={subHeader}
                    className={className}
                    key={modalId}
                    onClose={onClose}
                    walletComp={walletComp}
                >
                    {children}
                </Leaflet>
            )}
        </>
    )
})

export default Modal;