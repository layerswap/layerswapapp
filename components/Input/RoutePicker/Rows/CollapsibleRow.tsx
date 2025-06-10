import {
  RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "../../../shadcn/accordion";
import ReactPortal from "../../../Common/ReactPortal";
import { motion } from "framer-motion";
import {
  NetworkElement,
  GroupedTokenElement,
} from "../../../../Models/Route";
import { SwapDirection } from "../../../DTOs/SwapFormValues";
import { ResolveCurrencyOrder } from "../../../../lib/sorting";
import { CurrencySelectItemDisplay, GroupedTokenHeader, RouteSelectItemDisplay } from "../Routes";
import { NetworkRoute, NetworkRouteToken } from "../../../../Models/Network";

type GenericAccordionRowProps = {
  item: NetworkElement | GroupedTokenElement;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  selectedRoute: string | undefined;
  selectedToken: string | undefined;
  toggleContent: (itemName: string) => void;
  openValues?: string[];
  scrollContainerRef: RefObject<HTMLDivElement>;
  allbalancesLoaded: boolean;
};

function getSortedRouteTokens(route: NetworkRoute) {
  return route.tokens?.sort((a, b) => ResolveCurrencyOrder(a) - ResolveCurrencyOrder(b));
}

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

  let childrenList: ChildWrapper[] | undefined;

  if (isGrouped) {
    const grouped = item as GroupedTokenElement;
    childrenList = grouped.items.map((el) => ({
      token: el.route.token,
      route: el.route.route,
    }));
  } else {
    const route = (item as NetworkElement).route;
    const sortedTokens = getSortedRouteTokens(route) || [];
    childrenList = sortedTokens.map((t) => ({
      token: t,
      route: route as NetworkRoute,
    }));
  }

  const [isSticky, setSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isOpen = openValues?.some((ov) => ov === groupName);

  useEffect(() => {
    if (!isOpen) {
      setSticky(false);
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const headerRect = headerRef.current?.getBoundingClientRect();
      const contentRect = contentRef.current?.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const passedTop = Number(headerRect?.top) - 3 <= containerRect.top;
      const contentGone =
        Number(contentRect?.bottom) <=
        containerRect.top + (headerRect?.height || 0) * 1.5;
      setSticky(passedTop && !contentGone && Boolean(childrenList && childrenList.length > 1));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [isOpen, scrollContainerRef, headerRef, contentRef, childrenList]);

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
            {isGrouped ? (
              <GroupedTokenHeader
                item={item as GroupedTokenElement}
                //direction={direction}
                //allbalancesLoaded={allbalancesLoaded}
              />
            ) : (
              <RouteSelectItemDisplay
                item={(item as NetworkElement).route}
                selected={false}
                direction={direction}
                allbalancesLoaded={allbalancesLoaded}
              />
            )}
          </AccordionTrigger>
        </div>

        {isSticky && (
          <ReactPortal wrapperId="sticky_accordion_header">
            <div
              onClick={stickyToggle}
              className="cursor-pointer bg-secondary-700 hover:bg-secondary-600 relative pb-1"
            >
              {isGrouped ? (
                <GroupedTokenHeader
                  item={item as GroupedTokenElement}
                  //direction={direction}
                  //allbalancesLoaded={allbalancesLoaded}
                />
              ) : (
                <RouteSelectItemDisplay
                  item={(item as NetworkElement).route}
                  selected={false}
                  direction={direction}
                  allbalancesLoaded={allbalancesLoaded}
                />
              )}
            </div>
          </ReactPortal>
        )}

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