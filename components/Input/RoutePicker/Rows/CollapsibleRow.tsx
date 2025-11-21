import { RefObject, useMemo, useRef, useState, forwardRef, useEffect } from "react";
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
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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
        childElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [isChildFocused, focusedChild]);

  const stickyToggle = () => {
    toggleContent(groupName);
    headerRef.current?.scrollIntoView({ block: "start", inline: "start" });
  };

  return (
    <motion.div {...(!searchQuery && { layout: "position" })} key={searchQuery ? "search" : "default"}>
      <AccordionItem value={groupName}>
        <div
          ref={(el) => {
            if (headerRef) {
              (headerRef as any).current = el;
            }
            if (ref && typeof ref === 'function') {
              ref(el);
            } else if (ref) {
              (ref as any).current = el;
            }
          }}
          id={headerId}
          data-nav-index={navigableIndex >= 0 ? navigableIndex.toString() : undefined}
          onClick={() => toggleContent(groupName)}
          onMouseEnter={() => navigableIndex >= 0 && onHover(navigableIndex.toString())}
          className={clsx(
            "cursor-pointer rounded-lg relative group/accordion",
            isSticky && "opacity-0",
            isFocused && "is-focused"
          )}
        >
          <AccordionTrigger>
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
                  <div
                    key={`${groupName}-${childIndex}`}
                    ref={(el) => { childRefs.current[childIndex] = el; }}
                    data-nav-index={`${navigableIndex}.${childIndex}`}
                    className={clsx(
                      "token-item pl-2 pr-3 cursor-pointer rounded-xl outline-none disabled:cursor-not-allowed",
                      !isThisChildFocused && "hover:bg-secondary-400",
                      isThisChildFocused && "bg-secondary-400"
                    )}
                    onClick={() => onSelect(route, token)}
                    onMouseEnter={() => onHover(`${navigableIndex}.${childIndex}`)}
                  >
                    <CurrencySelectItemDisplay
                      item={token}
                      selected={isSelected}
                      route={route}
                      direction={direction}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  );
})