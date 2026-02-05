import { ReactNode } from "react";
import { Modal, ModalContent, ModalTrigger, useModalState } from "@/components/modal/modalWithoutAnimation";

export const Selector = ({ children }) => {
    return (
        <Modal>
            {children}
        </Modal>
    );
};

export const useSelectorState = () => {
    return useModalState();
}

type ContentChildProps = {
    closeModal: () => void;
    shouldFocus: boolean;
}

type SelectContentProps = {
    header?: ReactNode;
    searchHint?: string;
    children: ((props: ContentChildProps) => JSX.Element);
    isLoading: boolean;
    ref?: React.RefObject<HTMLDivElement>;
}

export const SelectorContent = (props: SelectContentProps) => {
    const { children, header } = props;

    return (
        <ModalContent header={header} ref={props.ref}>
            {children}
        </ModalContent>
    );
}

type SelectTriggerProps = {
    disabled: boolean;
    children: React.ReactNode | React.ReactNode[];
    className?: string;
}

export const SelectorTrigger = (props: SelectTriggerProps) => {
    return <ModalTrigger {...props} />;
}
