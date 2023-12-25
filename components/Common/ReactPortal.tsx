import { FC, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type Props = {
    wrapperId: string;
    children?: React.ReactNode
}

const ReactPortal: FC<Props> = ({ children, wrapperId = "react-portal-wrapper" }) => {
    const ref = useRef<Element | null>(null);
    useEffect(() => {
        let element = document.getElementById(wrapperId);
        if (!element) {
            element = document.createElement('div');
            element.setAttribute("id", wrapperId);
            document.body.appendChild(element);
        }
        ref.current = element
    }, [wrapperId]);

    return ref.current ? createPortal(children, ref.current) : null;
};

export default ReactPortal