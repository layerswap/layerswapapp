import { Dispatch, SetStateAction, ReactNode, useEffect } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
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
}: {
    children: ReactNode;
    opener: ReactNode | string;
    align?: "center" | "start" | "end";
    show: boolean;
    isNested?: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
    header?: ReactNode;
}) {
    const { isMobile, isDesktop } = useWindowDimensions();

    useEffect(() => {
        if (isMobile && show) {
            window.document.body.style.overflow = 'hidden'
        }
        return () => { window.document.body.style.overflow = '' }
    }, [show])

    return (
        <>
            <AnimatePresence>
                <div>
                    {opener}
                    {show && <Leaflet position="fixed" height="fit" title={header} setShow={setShow} show={show}>{children}</Leaflet>}
                </div>
            </AnimatePresence>
        </>
    );
}