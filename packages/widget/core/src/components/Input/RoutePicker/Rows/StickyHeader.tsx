import { RefObject, useEffect } from "react";
import ReactPortal from "@/components/Common/ReactPortal";
import { CollapsableHeader } from "./CollapsableHeader";
import { GroupedTokenElement, NetworkElement } from "@/Models/Route";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";

type StickyHeaderProps = {
    item: NetworkElement | GroupedTokenElement;
    direction: SwapDirection;
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    open: boolean | undefined;
    headerRef: React.RefObject<HTMLDivElement | null>;
    contentRef: React.RefObject<HTMLDivElement | null>;
    childrenCount?: number;
    onClick: () => void;
    isSticky: boolean;
    setSticky: React.Dispatch<React.SetStateAction<boolean>>;
    hideBalances?: boolean;
};

export function StickyHeader({
    item,
    direction,
    scrollContainerRef,
    open,
    headerRef,
    contentRef,
    childrenCount,
    onClick,
    isSticky,
    setSticky,
    hideBalances,
}: StickyHeaderProps) {

    useEffect(() => {
        if (!open) {
            setSticky(false);
            return;
        }

        const scrollContainer = scrollContainerRef.current;
        let frame = 0;
        const updateSticky = () => {
            frame = 0;
            if (!headerRef.current || !contentRef.current || !scrollContainer) return;

            const headerRect = headerRef.current.getBoundingClientRect();
            const contentRect = contentRef.current.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            const passedTop = headerRect.top - 3 <= containerRect.top;
            const contentGone =
                contentRect.bottom <=
                containerRect.top + headerRect.height * 1.5;

            setSticky(passedTop && !contentGone && Boolean(childrenCount && childrenCount > 1));
        };

        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(updateSticky);
        };

        scrollContainer?.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            scrollContainer?.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(frame);
        };
    }, [scrollContainerRef, open, headerRef, contentRef, childrenCount]);

    if (!isSticky) return null;

    return (
        <ReactPortal wrapperId="sticky_accordion_header">
            <div
                onClick={onClick}
                className="cursor-pointer bg-secondary-700 hover:bg-secondary-600 relative pb-1"
            >
                <CollapsableHeader
                    item={item}
                    direction={direction}
                    isOpen={open}
                    hideBalances={hideBalances}
                />
            </div>
        </ReactPortal>
    );
}
