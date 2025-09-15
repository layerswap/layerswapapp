import { createContext, ReactNode, SetStateAction, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import IconButton from "@/components/buttons/iconButton";
import { X } from 'lucide-react';
import clsx from "clsx";

type ModalProps = {
    setIsOpen: (value: SetStateAction<boolean>) => void;
    isOpen: boolean
    shouldFocus: boolean;
    setShouldFocus: (value: SetStateAction<boolean>) => void;
}

const ModalContext = createContext<ModalProps>({ isOpen: false, setIsOpen: () => { }, shouldFocus: false, setShouldFocus: () => { } });

export const Modal = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [shouldFocus, setShouldFocus] = useState(false);

    return (
        <ModalContext.Provider value={{ isOpen, setIsOpen, shouldFocus, setShouldFocus }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModalState = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModalState must be used within a Modal");
    }
    return context;
}

type ContentChildProps = {
    closeModal: () => void;
    shouldFocus: boolean;
}

type ModalContentProps = {
    header?: ReactNode;
    children: ((props: ContentChildProps) => JSX.Element) | JSX.Element;
    className?: string;
    showCloseButton?: boolean;
}

export const ModalContent = (props: ModalContentProps) => {
    const { children, header, className = "", showCloseButton = true } = props
    const { isOpen, setIsOpen, setShouldFocus, shouldFocus } = useModalState();
    const closeModal = () => { setIsOpen(false); setShouldFocus(false) };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeModal();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
        }

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    const modalElement = (
        <div className={clsx("absolute inset-0 z-50 bg-secondary-700 rounded-t-3xl sm:rounded-3xl flex flex-col", className)}>
            {(header || showCloseButton) && (
                <div className="w-full relative">
                    <div className="flex items-center w-full text-left justify-between px-4 sm:pt-2 pb-2 gap-x-1">
                        <div className="flex-1 text-lg text-secondary-text font-semibold w-full flex justify-end">
                            {header}
                        </div>
                        {showCloseButton && (
                            <IconButton onClick={closeModal} icon={
                                <X strokeWidth={3} />
                            }>
                            </IconButton>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col w-full h-full max-h-[90dvh] px-4 styled-scroll overflow-x-hidden overflow-y-auto relative pb-3">
                {typeof children === 'function' ? children({ closeModal, shouldFocus }) : children}
            </div>
        </div>
    );

    const widgetElement = document.getElementById('widget');

    if (!widgetElement) {
        console.warn('Widget element not found, modal will not render');
        return null;
    }

    return createPortal(modalElement, widgetElement);
}

type ModalTriggerProps = {
    disabled?: boolean;
    children: React.ReactNode | React.ReactNode[];
    className?: string;
    onClick?: () => void;
}

export const ModalTrigger = (props: ModalTriggerProps) => {
    const { disabled = false, children, className = "", onClick } = props
    const { setIsOpen, setShouldFocus } = useContext(ModalContext);
    const { isDesktop } = useWindowDimensions();

    function openModal() {
        setIsOpen(true)
        isDesktop && setShouldFocus(true)
        onClick?.();
    }

    return (
        <div className="shadow-sm/30 rounded-2xl flex items-center relative w-full z-10 self-end">
            <button
                type="button"
                onClick={openModal}
                disabled={disabled}
                className={clsx("rounded-2xl focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 flex items-center text-left justify-bottom w-full px-2 pr-0 bg-secondary-300 hover:bg-secondary-200 font-semibold", className)}
            >
                {children}
            </button>
        </div>
    )
}