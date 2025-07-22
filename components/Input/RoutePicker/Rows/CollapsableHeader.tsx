import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { GroupedTokenElement, NetworkElement } from "@/Models/Route";
import { GroupedTokenHeader, NetworkRouteSelectItemDisplay } from "../Routes";

type Props = {
    item: GroupedTokenElement | NetworkElement
    direction: SwapDirection;
    allbalancesLoaded?: boolean;
    hideTokenImages?: boolean;
    destAddress?: string;
};

export const CollapsableHeader = ({
    item,
    direction,
    allbalancesLoaded,
    hideTokenImages,
    destAddress,
}: Props) => {
    const groupedByToken = item.type === "grouped_token";

    return groupedByToken ? (
        <GroupedTokenHeader
            item={item as GroupedTokenElement}
            direction={direction}
            allbalancesLoaded={allbalancesLoaded}
            hideTokenImages={hideTokenImages}
            destAddress={destAddress}
        />
    ) : (
        <NetworkRouteSelectItemDisplay
            item={(item as NetworkElement).route}
            selected={false}
            direction={direction}
            allbalancesLoaded={allbalancesLoaded}
            hideTokenImages={hideTokenImages}
            destAddress={destAddress}
        />
    );
};
