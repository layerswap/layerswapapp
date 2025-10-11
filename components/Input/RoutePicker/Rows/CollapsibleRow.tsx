import {
  RefObject,
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
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { CurrencySelectItemDisplay } from "../Routes";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { CollapsableHeader } from "./CollapsableHeader";
import { StickyHeader } from "./StickyHeader";

type GenericAccordionRowProps = {
  item: NetworkElement | GroupedTokenElement;
  direction: SwapDirection;
  onSelect: (route: NetworkRoute, token: NetworkRouteToken) => void;
  selectedRoute: string | undefined;
  selectedToken: string | undefined;
  toggleContent: (itemName: string) => void;
  openValues?: string[];
  scrollContainerRef: RefObject<HTMLDivElement>;
  allbalancesLoaded?: boolean;
};

type ChildWrapper = {
  token: NetworkRouteToken;
  route: NetworkRoute;
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
            <CollapsableHeader
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
          className="AccordionContent"
          ref={contentRef}
          itemsCount={childrenList?.length}
        >
          <div className="has-[.token-item]:mt-1 bg-secondary-500 rounded-xl overflow-hidden">
            <div className="overflow-y-auto styled-scroll p-2">
              {childrenList?.map(({ token, route }, index) => {
                const isSelected = selectedRoute === route.name && selectedToken === token.symbol;

                return (
                  <div
                    key={`${groupName}-${index}`}
                    className={`token-item pl-2 pr-3 cursor-pointer hover:bg-secondary-400 rounded-xl outline-none disabled:cursor-not-allowed`}
                    onClick={() => onSelect(route, token)}
                  >
                    <CurrencySelectItemDisplay
                      allbalancesLoaded={allbalancesLoaded}
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
};