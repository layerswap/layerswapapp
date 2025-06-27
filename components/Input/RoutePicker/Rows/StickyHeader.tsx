import { useEffect } from "react";
import ReactPortal from "../../../Common/ReactPortal";
import { CollapsableHeader } from "./CollapsableHeader";
import { ExchangeElement, GroupedTokenElement, NetworkElement } from "../../../../Models/Route";
import { SwapDirection } from "../../../DTOs/SwapFormValues";

type StickyHeaderProps = {
    item: NetworkElement | GroupedTokenElement | ExchangeElement;
    direction: SwapDirection;
    scrollContainer: HTMLDivElement | null;
    open: boolean | undefined;
    headerRef: React.RefObject<HTMLDivElement>;
    contentRef: React.RefObject<HTMLDivElement>;
    allbalancesLoaded?: boolean;
    childrenCount?: number;
    onClick: () => void;
    isSticky: boolean;
    setSticky: React.Dispatch<React.SetStateAction<boolean>>;
};

export function StickyHeader({
    item,
    direction,
    scrollContainer,
    open,
    headerRef,
    contentRef,
    allbalancesLoaded,
    childrenCount,
    onClick,
    isSticky,
    setSticky,
}: StickyHeaderProps) {

    useEffect(() => {
        if (!open) {
            setSticky(false);
            return;
        }

        const onScroll = () => {
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

        scrollContainer?.addEventListener("scroll", onScroll, { passive: true });
        return () => scrollContainer?.removeEventListener("scroll", onScroll);
    }, [scrollContainer, open, headerRef, contentRef, childrenCount]);

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
                    allbalancesLoaded={allbalancesLoaded}
                    hideTokenImages={open}
                />
            </div>
        </ReactPortal>
    );
}
