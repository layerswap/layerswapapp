import { createContext, ReactNode, SetStateAction, useContext, useState } from "react";
import { LeafletHeight } from "../../modal/leaflet";
import Modal from "../../modal/modal";
import VaulDrawer from "@/components/modal/vaulModal";
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
}

type SelectContentProps = {
    header?: ReactNode;
    searchHint?: string;
    modalHeight?: LeafletHeight;
    modalContent?: React.ReactNode;
    children: ((props: ContentChildProps) => JSX.Element);
    isLoading: boolean;
}

export const SelectorContent = (props: SelectContentProps) => {
    const { children, modalContent, header } = props
    const { isOpen, setIsOpen, setShouldFocus } = useSelectorState();
    const { isDesktop, isMobile, windowSize } = useWindowDimensions();
    const closeModal = () => { setIsOpen(false); setShouldFocus(false) };

    return <VaulDrawer
        header={
            header ?
                <div className="flex-1 text-lg text-secondary-text font-semibold w-full flex justify-end">
                    {header}
                </div>
                : <></>
        }
        show={isOpen}
        setShow={(v) => { setIsOpen(v); v == false && setShouldFocus(v) }}
        modalId='comandSelect'
        onAnimationEnd={() => { isDesktop && isOpen && setShouldFocus(true) }}
    >
        <VaulDrawer.Snap
            id="item-1"
            style={{ height: isMobile && windowSize.height ? `${(windowSize.height * 0.8).toFixed()}px` : '100%' }}
            fullheight={isDesktop}
        >
            <>
                {modalContent}
                {children({ closeModal })}
            </>
        </VaulDrawer.Snap>
    </VaulDrawer>
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
    return <div className="shadow-sm/30 rounded-xl flex items-center relative w-full z-10 self-end ">
        <button
            type="button"
            onClick={openModal}
            disabled={disabled}
            className={`rounded-xl focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 flex items-center text-left justify-bottom w-full px-2 pr-0 bg-secondary-300 hover:bg-secondary-200 font-semibold ${className}`}
        >
            {children}
        </button>
    </div>
}
