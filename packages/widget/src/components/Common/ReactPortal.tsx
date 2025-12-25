import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
    wrapperId: string;
    children?: React.ReactNode
}

const ReactPortal: FC<Props> = ({ children, wrapperId = "react-portal-wrapper" }) => {
    const ref = useRef<Element | null>(null);
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        let element = document.getElementById(wrapperId);
        if (!element) {
            element = document.createElement('div');
            element.setAttribute("id", wrapperId);
            document.body.appendChild(element);
        }
        ref.current = element
        setMounted(true)
    }, [wrapperId]);

    return ref.current && mounted ? createPortal(children, ref.current) : null;
};

export default ReactPortal