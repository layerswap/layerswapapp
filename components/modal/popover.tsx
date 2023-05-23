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
}: {
    children: ReactNode;
    opener: ReactNode | string;
    align?: "center" | "start" | "end";
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
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
            {isMobile && opener}
            <AnimatePresence>
                {show && isMobile && (
                    <Leaflet position="fixed" height="fit" setShow={setShow} show={show}>{children}</Leaflet>
                )}
                {isDesktop && (
                    <PopoverPrimitive.Root>
                        <PopoverPrimitive.Trigger className="inline-flex" asChild>
                            {opener}
                        </PopoverPrimitive.Trigger>
                        <PopoverPrimitive.Content
                            sideOffset={4}
                            onInteractOutside={() => setShow(false)}
                            align={align}
                            className="z-20 animate-slide-up-fade items-center rounded-md bg-secondary-900 border-2 border-secondary-500 drop-shadow-lg"
                        >
                            {show && children}
                        </PopoverPrimitive.Content>
                    </PopoverPrimitive.Root>
                )}
            </AnimatePresence>
        </>
    );
}