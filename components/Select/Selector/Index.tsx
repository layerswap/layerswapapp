import { createContext, ReactNode, SetStateAction, useContext, useState } from "react";
import { createPortal } from "react-dom";
import useWindowDimensions from "@/hooks/useWindowDimensions";

type SelectorProps = {
    setIsOpen: (value: SetStateAction<boolean>) => void;
    isOpen: boolean
    shouldFocus: boolean;
    setShouldFocus: (value: SetStateAction<boolean>) => void;
}

const SelectorContext = createContext<SelectorProps>({ isOpen: false, setIsOpen: () => { }, shouldFocus: false, setShouldFocus: () => { } });

export const Selector = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [shouldFocus, setShouldFocus] = useState(false);

    return (
        <SelectorContext.Provider value={{ isOpen, setIsOpen, shouldFocus, setShouldFocus }}>
            {children}
        </SelectorContext.Provider>
    );
};

export const useSelectorState = () => {
    const context = useContext(SelectorContext);
    if (!context) {
        throw new Error("useSelectorContext must be used within a SelectorProvider");
    }
    return context;
}

type ContentChildProps = {
    closeModal: () => void;
    shouldFocus?: boolean;
}

type SelectContentProps = {
    header?: ReactNode;
    searchHint?: string;
    modalContent?: React.ReactNode;
    children: ((props: ContentChildProps) => JSX.Element);
    isLoading: boolean;
}

export const SelectorContent = (props: SelectContentProps) => {
    const { children, modalContent, header } = props
    const { isOpen, setIsOpen, setShouldFocus, shouldFocus } = useSelectorState();
    const { isDesktop } = useWindowDimensions();
    const closeModal = () => { setIsOpen(false); setShouldFocus(false) };

    if (!isOpen) return null;

    const modalElement = (
        <div className="absolute inset-0 z-50 bg-secondary-700 rounded-t-3xl sm:rounded-3xl flex flex-col">
            {/* Header */}
            {header && (
                <div className="w-full relative">
                    <div className="flex items-center w-full text-left justify-between px-4 sm:pt-3 pb-2">
                        <div className="flex-1 text-lg text-secondary-text font-semibold w-full flex justify-end">
                            {header}
                        </div>
                        <button
                            onClick={closeModal}
                            className="inline-flex p-2 text-secondary-text hover:text-white transition-colors"
                            aria-label="Close modal"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            
            {/* Content */}
            <div className="flex flex-col w-full h-fit max-h-[90dvh] px-4 styled-scroll overflow-x-hidden overflow-y-auto relative">
                {modalContent}
                {children({ closeModal, shouldFocus: isDesktop && shouldFocus })}
            </div>
        </div>
    );

    // Find the widget container and render the modal there
    const widgetElement = document.getElementById('widget');
    
    if (!widgetElement) {
        console.warn('Widget element not found, modal will not render');
        return null;
    }

    return createPortal(modalElement, widgetElement);
}

type SelectTriggerProps = {
    disabled: boolean;
    children: React.ReactNode | React.ReactNode[];
    className?: string;
}

export const SelectorTrigger = (props: SelectTriggerProps) => {
    const { disabled, children, className } = props
    const { setIsOpen } = useContext(SelectorContext);
    function openModal() {
        setIsOpen(true)
    }
    return <div className="shadow-sm/30 rounded-2xl flex items-center relative w-full z-10 self-end ">
        <button
            type="button"
            onClick={openModal}
            disabled={disabled}
            className={`rounded-2xl focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 flex items-center text-left justify-bottom w-full px-2 pr-0 bg-secondary-300 hover:bg-secondary-200 font-semibold ${className}`}
        >
            {children}
        </button>
    </div>
}
