import { forwardRef, ReactNode } from "react";
import type { JSX } from 'react';
import { Modal, ModalContent, ModalTrigger, useModalState } from "@/components/Modal/modalWithoutAnimation";

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
}

export const SelectorContent = forwardRef<HTMLDivElement, SelectContentProps>((props, ref) => {
    const { children, header } = props;

    return (
        <ModalContent header={header} ref={ref}>
            {children}
        </ModalContent>
    );
});

SelectorContent.displayName = 'SelectorContent';

type SelectTriggerProps = {
    disabled: boolean;
    children: React.ReactNode | React.ReactNode[];
    className?: string;
}

export const SelectorTrigger = (props: SelectTriggerProps) => {
    return <ModalTrigger {...props} />;
}
