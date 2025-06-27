import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { ExchangeElement, GroupedTokenElement, NetworkElement } from "@/Models/Route";
import { GroupedTokenHeader, NetworkRouteSelectItemDisplay } from "./Routes";

type Props = {
    item: GroupedTokenElement | NetworkElement | ExchangeElement
    direction: SwapDirection;
    allbalancesLoaded?: boolean;
    hideTokenImages?: boolean;
};

export const AccordionHeaderContent = ({
    item,
    direction,
    allbalancesLoaded,
    hideTokenImages,
}: Props) => {
    const isGrouped = item.type === "grouped_token";

    return isGrouped ? (
        <GroupedTokenHeader
            item={item as GroupedTokenElement}
            direction={direction}
            allbalancesLoaded={allbalancesLoaded}
            hideTokenImages={hideTokenImages}
        />
    ) : (
        <NetworkRouteSelectItemDisplay
            item={(item as NetworkElement).route}
            selected={false}
            direction={direction}
            allbalancesLoaded={allbalancesLoaded}
            hideTokenImages={hideTokenImages}
        />
    );
};
