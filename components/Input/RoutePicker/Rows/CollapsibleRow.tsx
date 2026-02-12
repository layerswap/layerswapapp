import { RefObject, useMemo, useRef, useState, memo, useCallback } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/shadcn/accordion";
import { motion } from "framer-motion";
import { NetworkElement, GroupedTokenElement, } from "@/Models/Route";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { CollapsableHeader } from "./CollapsableHeader";
import { StickyHeader } from "./StickyHeader";
import { CurrencySelectItemDisplay } from "../Routes";
import clsx from "clsx";
import { NavigatableItem } from "@/components/NavigatableList";

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
}: GenericAccordionRowProps & { index: number }) => {
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
  const isOpen = openValues?.some((ov) => ov === groupName);

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
                hideTokenImages={isOpen}
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

                return (
                  <TokenItem
                    key={`${groupName}-${childIndex}`}
                    token={token}
                    route={route}
                    childIndex={childIndex}
                    groupName={groupName}
                    parentIndex={index}
                    isSelected={isSelected}
                    direction={direction}
                    onSelect={onSelect}
                  />
                );
              })}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  );
}

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
}>(({
  token,
  route,
  childIndex,
  groupName,
  parentIndex,
  isSelected,
  direction,
  onSelect,
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
      />
    </NavigatableItem>
  );
});
