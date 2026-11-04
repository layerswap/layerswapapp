import {
  memo,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";
import { motion } from "framer-motion";
import {
  NetworkElement,
  GroupedTokenElement,
} from "@/Models/Route";
import { CurrencySelectItemDisplay } from "../Routes";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { CollapsableHeader } from "./CollapsableHeader";
import { StickyHeader } from "./StickyHeader";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";
import clsx from "clsx";
import { NavigatableItem, NavigatableRegistrationContext, useNavigatableListState } from "@/components/NavigatableList";
import { useVirtualizer } from "@/lib/virtual";
import { defaultRangeExtractor, type Range } from "@/lib/virtual/core";

type GenericAccordionRowProps = {
  item: NetworkElement | GroupedTokenElement;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  selectedRoute: string | undefined;
  selectedToken: string | undefined;
  searchQuery: string
  toggleContent: (itemName: string) => void;
  openValues?: string[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  hideBalances?: boolean;
};

type ChildWrapper = {
  token: NetworkRouteToken;
  route: NetworkRoute;
};

export const CollapsibleRow = ({
  item,
  index,
  toggleContent,
  direction,
  onSelect,
  selectedRoute,
  selectedToken,
  searchQuery,
  openValues,
  scrollContainerRef,
  hideBalances,
}: GenericAccordionRowProps & { index: number }) => {
  const groupName = item.type === "grouped_token" ? item.symbol : item.route.name;
  const headerId = `${groupName}-header`;

  const childrenList: ChildWrapper[] = useMemo(() => {
    if (item.type === "grouped_token") {
      const grouped = item as GroupedTokenElement;
      return grouped.items.map((el) => ({
        token: el.route.token,
        route: el.route.route,
      }));
    } else {
      const route = (item as NetworkElement).route;
      return route.tokens.map((t) => ({
        token: t,
        route: route as NetworkRoute,
      }));
    }
  }, [item])

  const [isSticky, setSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isOpen = openValues?.some((ov) => ov === groupName);
  const registration = useContext(NavigatableRegistrationContext);
  const childrenCount = childrenList?.length ?? 0;

  useEffect(() => {
    if (!registration || !isOpen) return;
    registration.setChildCount(index, childrenCount);
    return () => registration.setChildCount(index, undefined);
  }, [registration, index, isOpen, childrenCount]);

  const stickyToggle = () => {
    toggleContent(groupName);
    headerRef.current?.scrollIntoView({ block: "start", inline: "start" });
  };

  const setHeaderRef = (el: HTMLDivElement | null) => {
    headerRef.current = el;
  };

  return (
    <motion.div
      //  {...(!searchQuery && { layout: "position" })} 
      key={searchQuery ? "search" : "default"}
    >
      <AccordionItem value={groupName}>
        <NavigatableItem
          index={index}
          onClick={() => toggleContent(groupName)}
          className={clsx(
            "cursor-pointer rounded-lg relative group/accordion hover:bg-secondary-500",
            isSticky && "opacity-0"
          )}
          focusedClassName="bg-secondary-500 is-focused"
        >
          <div ref={setHeaderRef} id={headerId}>
            <AccordionTrigger tabIndex={-1}>
              <CollapsableHeader
                item={item}
                direction={direction}
                isOpen={isOpen}
                hideBalances={hideBalances}
              />
            </AccordionTrigger>
          </div>
        </NavigatableItem>

        <StickyHeader
          item={item}
          direction={direction}
          scrollContainer={scrollContainerRef.current}
          open={isOpen}
          headerRef={headerRef}
          contentRef={contentRef}
          childrenCount={childrenList?.length}
          onClick={stickyToggle}
          isSticky={isSticky}
          setSticky={setSticky}
          hideBalances={hideBalances}
        />

        <AccordionContent
          className="AccordionContent"
          ref={contentRef}
          itemsCount={childrenList?.length}
        >
          <div className="has-[.token-item]:mt-1 bg-secondary-500 rounded-xl overflow-hidden">
            <div className="overflow-y-auto styled-scroll p-2">
              <VirtualTokenList
                childrenList={childrenList}
                groupName={groupName}
                parentIndex={index}
                selectedRoute={selectedRoute}
                selectedToken={selectedToken}
                direction={direction}
                onSelect={onSelect}
                scrollContainerRef={scrollContainerRef}
                hideBalances={hideBalances}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  );
}

// Only the visible tokens are mounted; networks like Ethereum have 1000+ tokens.
const VirtualTokenList = ({
  childrenList,
  groupName,
  parentIndex,
  selectedRoute,
  selectedToken,
  direction,
  onSelect,
  scrollContainerRef,
  hideBalances,
}: {
  childrenList: ChildWrapper[];
  groupName: string;
  parentIndex: number;
  selectedRoute: string | undefined;
  selectedToken: string | undefined;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  hideBalances?: boolean;
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const registration = useContext(NavigatableRegistrationContext);
  const { focusedIndex } = useNavigatableListState();
  const navigableParentIndex = registration?.getNavigableIndex(parentIndex) ?? -1;
  const effectiveParentIndex = navigableParentIndex >= 0 ? navigableParentIndex : parentIndex;
  const focusedChildIndex = focusedIndex?.parent === effectiveParentIndex ? focusedIndex.child : undefined;

  // Keep the focused token mounted so its scroll-into-view effect and Enter handler still work.
  const rangeExtractor = useCallback((range: Range) => {
    const indexes = defaultRangeExtractor(range);
    if (focusedChildIndex === undefined || focusedChildIndex >= range.count || indexes.includes(focusedChildIndex)) {
      return indexes;
    }
    return [...indexes, focusedChildIndex].sort((a, b) => a - b);
  }, [focusedChildIndex]);

  // The list sits below other rows inside the shared scroll container, so its offset must be measured.
  useLayoutEffect(() => {
    const list = listRef.current;
    const scroller = scrollContainerRef.current;
    if (!list || !scroller) return;
    const offset = list.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    setScrollMargin((prev) => (Math.abs(prev - offset) < 1 ? prev : offset));
  });

  const virtualizer = useVirtualizer({
    count: childrenList.length,
    estimateSize: () => 52,
    getScrollElement: () => scrollContainerRef.current,
    // The virtualizer scrolls to initialOffset on mount; keep the shared container where it is.
    initialOffset: () => scrollContainerRef.current?.scrollTop ?? 0,
    scrollMargin,
    overscan: 10,
    rangeExtractor,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={listRef}
      style={{ height: virtualizer.getTotalSize(), position: "relative" }}
    >
      {items.map((virtualRow) => {
        const { token, route } = childrenList[virtualRow.index];
        const isSelected = selectedRoute === route.name && selectedToken === token.symbol;

        return (
          <div
            key={`${groupName}-${virtualRow.index}`}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              // Per-row offsets: the pinned focused token can make the range non-contiguous.
              transform: `translateY(${virtualRow.start - scrollMargin}px)`,
            }}
          >
            <TokenItem
              token={token}
              route={route}
              childIndex={virtualRow.index}
              groupName={groupName}
              parentIndex={parentIndex}
              isSelected={isSelected}
              direction={direction}
              onSelect={onSelect}
              hideBalances={hideBalances}
            />
          </div>
        );
      })}
    </div>
  );
};

// Memoized child item to prevent re-renders when siblings change focus
const TokenItem = memo<{
  token: NetworkRouteToken;
  route: NetworkRoute;
  childIndex: number;
  groupName: string;
  parentIndex: number;
  isSelected: boolean;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  hideBalances?: boolean;
}>(({
  token,
  route,
  childIndex,
  groupName,
  parentIndex,
  isSelected,
  direction,
  onSelect,
  hideBalances,
}) => {
  const handleClick = useCallback(() => {
    onSelect(route, token);
  }, [onSelect, route, token]);

  return (
    <NavigatableItem
      key={`${groupName}-${childIndex}`}
      index={childIndex}
      parentIndex={parentIndex}
      onClick={handleClick}
      className="token-item pl-2 pr-3 cursor-pointer rounded-xl outline-none disabled:cursor-not-allowed hover:bg-secondary-400"
      focusedClassName="bg-secondary-400"
    >
      <CurrencySelectItemDisplay
        item={token}
        selected={isSelected}
        route={route}
        direction={direction}
        hideBalances={hideBalances}
      />
    </NavigatableItem>
  );
});
