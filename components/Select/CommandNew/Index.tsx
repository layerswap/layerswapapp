import { createContext, ReactNode, useContext, useState } from "react";
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
    header?: ReactNode;
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
    return <Modal
        header={
            header ?
                <div className="flex-1 text-lg text-secondary-text font-semibold w-full flex justify-end">
                    {header}
                </div>
                : <></>
        }
        height={modalHeight}
        show={isOpen}
        setShow={setIsOpen}
        modalId='comandSelect'
    >
        {
            isOpen ?
                <div className="h-full">
                    {modalContent}
                    {children({ closeModal })}
                </div>
                : <></>
        }
    </Modal>
}

type SelectTriggerProps = {
    disabled: boolean;
    children: React.ReactNode | React.ReactNode[];
}

export const SelectorTrigger = (props: SelectTriggerProps) => {
    const { disabled, children } = props
    const { setIsOpen } = useContext(SelectorContext);
    function openModal() {
        setIsOpen(true)
    }
    return <div className="shadow-sm/30 rounded-lg flex items-center relative w-full z-10 self-end ">
        <button
            type="button"
            onClick={openModal}
            disabled={disabled}
            className="rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow h-12 flex items-center text-left justify-bottom w-full px-2 pr-0 bg-secondary-300 hover:bg-secondary-200 font-semibold"
        >
            {children}
        </button>
    </div>
}
