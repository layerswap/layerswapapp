import { createContext, useContext, useState } from "react";
import { LeafletHeight } from "../../modal/leaflet";
import Modal from "../../modal/modal";
import { CommandEmpty, CommandInput, CommandList, CommandWrapper } from "../../shadcn/command";
import useWindowDimensions from "../../../hooks/useWindowDimensions";
import SpinIcon from "../../icons/spinIcon";

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
    children: React.ReactNode | React.ReactNode[]
}

export const SelectorTrigger = (props: SelectTriggerProps) => {
    const { disabled, children } = props
    const { setIsOpen } = useContext(SelectorContext);
    function openModal() {
        setIsOpen(true)
    }
    return <div className="flex items-center relative">
        <button
            type="button"
            onClick={openModal}
            disabled={disabled}
            className="rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 flex items-center text-left justify-bottom w-full pl-3 pr-2 py-2 bg-secondary-600 font-semibold"
        >
            {children}
        </button>
    </div>
}
