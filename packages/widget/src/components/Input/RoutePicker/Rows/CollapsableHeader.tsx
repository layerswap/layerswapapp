import { GroupedTokenElement, NetworkElement } from "@/Models/Route";
import { GroupedTokenHeader, NetworkRouteSelectItemDisplay } from "../Routes";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";

type Props = {
    item: GroupedTokenElement | NetworkElement
    direction: SwapDirection;
    allbalancesLoaded?: boolean;
    hideTokenImages?: boolean;
};

export const CollapsableHeader = ({
    item,
    direction,
    allbalancesLoaded,
    hideTokenImages,
}: Props) => {
    const groupedByToken = item.type === "grouped_token";

    return groupedByToken ? (
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
