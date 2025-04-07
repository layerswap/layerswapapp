import { createContext, useContext, useState } from "react";
import { LeafletHeight } from "../../modal/leaflet";
import Modal from "../../modal/modal";

type SelectorProps = {
    setIsOpen: (value: boolean) => void;
    isOpen: boolean
}

const SelectorContext = createContext<SelectorProps>({ isOpen: false, setIsOpen: () => { } });

export const Selector = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <SelectorContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
        </SelectorContext.Provider>
    );
};

type ContentChildProps = {
    closeModal: () => void;
}

type SelectContentProps = {
    header?: string;
    searchHint?: string;
    modalHeight?: LeafletHeight;
    modalContent?: React.ReactNode;
    children: ((props: ContentChildProps) => JSX.Element);
    isLoading: boolean;
}

export const SelectorContent = (props: SelectContentProps) => {
    const { children, modalContent, header, modalHeight, searchHint, isLoading } = props
    const { isOpen, setIsOpen } = useContext(SelectorContext);
    const closeModal = () => setIsOpen(false)
    return <Modal height={modalHeight} show={isOpen} setShow={setIsOpen} modalId='comandSelect'>
        {header ? <div className="absolute top-4 left-8 text-lg text-secondary-text font-semibold">
            <div>{header}</div>
        </div> : <></>}
        {isOpen ?
            <div>
                {modalContent}
                <div>{children({ closeModal })}</div>
            </div>
            : <></>
        }
    </Modal>
}

type SelectTriggerProps = {
    disabled: boolean;
    children: React.ReactNode | React.ReactNode[];
    direction?: string;
}

export const SelectorTrigger = (props: SelectTriggerProps) => {
    const { disabled, children, direction } = props
    const { setIsOpen } = useContext(SelectorContext);
    function openModal() {
        setIsOpen(true)
    }
    return <div className={`${direction === "from" ? "in-has-[.input-wide]:w-fit" : ""} shadow-sm/30 rounded-lg flex items-center relative w-full z-10`}>
        <button
            type="button"
            onClick={openModal}
            disabled={disabled}
            className="rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 flex items-center text-left justify-bottom w-full px-2 py-2 bg-secondary-300 font-semibold"
        >
            {children}
        </button>
    </div>
}
