import {
  RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "../../../shadcn/accordion";
import ReactPortal from "../../../Common/ReactPortal";
import { motion } from "framer-motion";
import {
  NetworkElement,
  GroupedTokenElement,
  ExchangeElement,
} from "../../../../Models/Route";
import { SwapDirection } from "../../../DTOs/SwapFormValues";
import { CurrencySelectItemDisplay, GroupedTokenHeader, NetworkRouteSelectItemDisplay } from "../Routes";
import { NetworkRoute, NetworkRouteToken } from "../../../../Models/Network";
import { AccordionHeaderContent } from "../AccordionHeaderContent";
import { StickyHeader } from "./StickyAccordionHeader";

type GenericAccordionRowProps = {
  item: NetworkElement | GroupedTokenElement | ExchangeElement;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  selectedRoute: string | undefined;
  selectedToken: string | undefined;
  toggleContent: (itemName: string) => void;
  openValues?: string[];
  scrollContainerRef: RefObject<HTMLDivElement>;
  allbalancesLoaded?: boolean;
};

export const CollapsibleRow = ({
  item,
  toggleContent,
  direction,
  onSelect,
  selectedRoute,
  selectedToken,
  openValues,
  scrollContainerRef,
  allbalancesLoaded,
}: GenericAccordionRowProps) => {
  const isGrouped = item.type === "grouped_token";
  const groupName = isGrouped ? (item as GroupedTokenElement).symbol : (item as NetworkElement).route.name;
  const headerId = `${groupName}-header`;

  type ChildWrapper = {
    token: NetworkRouteToken;
    route: NetworkRoute;
  };

  const childrenList: ChildWrapper[] | undefined = useMemo(() => {
    if (isGrouped) {
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
  const isOpen = openValues?.some((ov) => ov === groupName);

  const stickyToggle = () => {
    toggleContent(groupName);
    headerRef.current?.scrollIntoView({ block: "start", inline: "start" });
  };

  return (
    <motion.div layout="position">
      <AccordionItem value={groupName}>
        <div
          ref={headerRef}
          id={headerId}
          onClick={() => toggleContent(groupName)}
          className={`cursor-pointer bg-secondary-700 rounded-lg hover:bg-secondary-600 relative ${isSticky ? "opacity-0" : ""
            }`}
        >
          <AccordionTrigger>
            <AccordionHeaderContent
              item={item}
              direction={direction}
              allbalancesLoaded={allbalancesLoaded}
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
          allbalancesLoaded={allbalancesLoaded}
          childrenCount={childrenList?.length}
          onClick={stickyToggle}
          isSticky={isSticky}
          setSticky={setSticky}
        />

        <AccordionContent
          className="AccordionContent mt-1"
          ref={contentRef}
        >
          <div className="has-[.token-item]:mt-1 bg-secondary-400 rounded-xl overflow-hidden">
            <div className="overflow-y-auto styled-scroll">
              {childrenList?.map(({ token, route }, index) => {
                const isSelected = selectedRoute === route.name && selectedToken === token.symbol;

                return (
                  <div
                    key={`${groupName}-${index}`}
                    className={`token-item pl-5 cursor-pointer hover:bg-secondary-300 ${isSelected ? "bg-secondary-300" : ""} outline-none disabled:cursor-not-allowed`}
                    onClick={() => onSelect(route, token)}
                  >
                    <CurrencySelectItemDisplay
                      allbalancesLoaded={allbalancesLoaded}
                      item={token}
                      selected={isSelected}
                      route={route}
                      direction={direction}
                      isGroupedToken={isGrouped}
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
};