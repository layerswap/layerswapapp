import { RefObject, useMemo, useRef, useState, forwardRef, useEffect, memo, useCallback } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";
import { motion } from "framer-motion";
import { NetworkElement, GroupedTokenElement, } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { CollapsableHeader } from "./CollapsableHeader";
import { StickyHeader } from "./StickyHeader";
import { CurrencySelectItemDisplay } from "../Routes";
import clsx from "clsx";

type GenericAccordionRowProps = {
  item: NetworkElement | GroupedTokenElement;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  selectedRoute: string | undefined;
  selectedToken: string | undefined;
  searchQuery: string
  toggleContent: (itemName: string) => void;
  openValues?: string[];
  scrollContainerRef: RefObject<HTMLDivElement>;
  focusedIndex: string | null;
  navigableIndex: number;
  isFocused: boolean;
  onHover: (index: string) => void;
};

type ChildWrapper = {
  token: NetworkRouteToken;
  route: NetworkRoute;
};

export const CollapsibleRow = forwardRef<HTMLDivElement, GenericAccordionRowProps & { index: number }>(({
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
  focusedIndex,
  navigableIndex,
  isFocused,
  onHover
}, ref) => {
  const groupName = item.type === "grouped_token" ? item.symbol : item.route.name;
  const headerId = `${groupName}-header`;

  const childrenList: ChildWrapper[] | undefined = useMemo(() => {
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
  const childRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isOpen = openValues?.some((ov) => ov === groupName);
  const focusedParts = focusedIndex?.split('.') || [];
  const focusedParent = focusedParts[0] ? parseInt(focusedParts[0]) : -1;
  const focusedChild = focusedParts[1] !== undefined ? parseInt(focusedParts[1]) : undefined;
  const isChildFocused = focusedIndex !== null && focusedParent === navigableIndex && focusedChild !== undefined;

  useEffect(() => {
    if (isChildFocused && focusedChild !== undefined) {
      const childElement = childRefs.current[focusedChild];
      if (childElement) {
        childElement.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }
  }, [isChildFocused, focusedChild]);

  const stickyToggle = () => {
    toggleContent(groupName);
    headerRef.current?.scrollIntoView({ block: "start", inline: "start" });
  };

  // Stable callback for setting child refs
  const setChildRef = useCallback((index: number, el: HTMLDivElement | null) => {
    childRefs.current[index] = el;
  }, []);

  // Merges local headerRef (used for scroll behavior & sticky header tracking)
  // with forwarded ref (allows parent components to access this element)
  const setRefs = (el: HTMLDivElement | null) => {
    headerRef.current = el;
    if (typeof ref === 'function') {
      ref(el);
    } else if (ref && 'current' in ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    }
  };

  return (
    <motion.div {...(!searchQuery && { layout: "position" })} key={searchQuery ? "search" : "default"}>
      <AccordionItem value={groupName}>
        <div
          ref={setRefs}
          id={headerId}
          data-nav-index={navigableIndex >= 0 ? navigableIndex.toString() : undefined}
          tabIndex={0}
          onClick={() => toggleContent(groupName)}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault();
              toggleContent(groupName);
            }
          }}
          onMouseEnter={() => navigableIndex >= 0 && onHover(navigableIndex.toString())}
          className={clsx(
            "cursor-pointer rounded-lg relative group/accordion",
            !isFocused && "hover:bg-secondary-500",
            isFocused && "bg-secondary-500",
            isSticky && "opacity-0",
            isFocused && "is-focused"
          )}
        >
          <AccordionTrigger tabIndex={-1}>
            <CollapsableHeader
              item={item}
              direction={direction}
              hideTokenImages={isOpen}
            />
          </AccordionTrigger>
        </div>

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
        />

        <AccordionContent
          className="AccordionContent"
          ref={contentRef}
          itemsCount={childrenList?.length}
        >
          <div className="has-[.token-item]:mt-1 bg-secondary-500 rounded-xl overflow-hidden">
            <div className="overflow-y-auto styled-scroll p-2">
              {childrenList?.map(({ token, route }, childIndex) => {
                const isSelected = selectedRoute === route.name && selectedToken === token.symbol;
                const isThisChildFocused = isChildFocused && focusedChild === childIndex;

                return (
                  <TokenItem
                    key={`${groupName}-${childIndex}`}
                    token={token}
                    route={route}
                    childIndex={childIndex}
                    groupName={groupName}
                    navigableIndex={navigableIndex}
                    isSelected={isSelected}
                    isFocused={isThisChildFocused}
                    direction={direction}
                    onSelect={onSelect}
                    onHover={onHover}
                    setRef={setChildRef}
                  />
                );
              })}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  );
})


// Memoized child item to prevent re-renders when siblings change focus
const TokenItem = memo<{
  token: NetworkRouteToken;
  route: NetworkRoute;
  childIndex: number;
  groupName: string;
  navigableIndex: number;
  isSelected: boolean;
  isFocused: boolean;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  onHover: (index: string) => void;
  setRef: (index: number, el: HTMLDivElement | null) => void;
}>(({ 
  token, 
  route, 
  childIndex, 
  groupName, 
  navigableIndex, 
  isSelected, 
  isFocused, 
  direction, 
  onSelect, 
  onHover,
  setRef 
}) => {
  const handleClick = useCallback(() => {
    onSelect(route, token);
  }, [onSelect, route, token]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      onSelect(route, token);
    }
  }, [onSelect, route, token]);

  const handleMouseEnter = useCallback(() => {
    onHover(`${navigableIndex}.${childIndex}`);
  }, [onHover, navigableIndex, childIndex]);

  const handleRef = useCallback((el: HTMLDivElement | null) => {
    setRef(childIndex, el);
  }, [setRef, childIndex]);

  return (
    <div
      key={`${groupName}-${childIndex}`}
      ref={handleRef}
      data-nav-index={`${navigableIndex}.${childIndex}`}
      tabIndex={0}
      className={clsx(
        "token-item pl-2 pr-3 cursor-pointer rounded-xl outline-none disabled:cursor-not-allowed",
        !isFocused && "hover:bg-secondary-400",
        isFocused && "bg-secondary-400"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
    >
      <CurrencySelectItemDisplay
        item={token}
        selected={isSelected}
        route={route}
        direction={direction}
      />
    </div>
  );
});