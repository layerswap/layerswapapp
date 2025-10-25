import { Dispatch, SetStateAction, ReactNode, useEffect } from "react";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import { Leaflet } from "./leaflet";
import { AnimatePresence } from "framer-motion";

export default function Popover({
    children,
    opener,
    align = "center",
    show,
    setShow,
    isNested,
    header,
    popoverId,
}: {
    children: ReactNode;
    opener: ReactNode | string;
    align?: "center" | "start" | "end";
    show: boolean;
    isNested?: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    header?: ReactNode;
    popoverId: string;
}) {
    const { isMobile } = useWindowDimensions();

    useEffect(() => {
        if (isMobile && show) {
            window.document.body.style.overflow = 'hidden'
        }
        return () => { window.document.body.style.overflow = '' }
    }, [isMobile, show])

    return (
        <>
            <AnimatePresence>
                <div key={popoverId}>
                    {opener}
                    {show && <Leaflet position="fixed" height="fit" title={header} setShow={setShow} show={show}>{children}</Leaflet>}
                </div>
            </AnimatePresence>
        </>
    );
}