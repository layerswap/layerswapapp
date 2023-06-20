import { FC } from 'react';
import { createPortal } from 'react-dom';

type Props = {
    wrapperId: string
}

const ReactPortal: FC<Props> = ({ children, wrapperId = "react-portal-wrapper" }) => {
    let element = document.getElementById(wrapperId);
    // if element is not found with wrapperId,
    // create and append to body
    if (!element) {
        element = createWrapperAndAppendToBody(wrapperId);
    }
    return createPortal(children, element);
}

function createWrapperAndAppendToBody(wrapperId) {
    const wrapperElement = document.createElement('div');
    wrapperElement.setAttribute("id", wrapperId);
    document.body.appendChild(wrapperElement);
    return wrapperElement;
}

export default ReactPortal