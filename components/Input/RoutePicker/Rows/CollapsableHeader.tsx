import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { GroupedTokenElement, NetworkElement } from "@/Models/Route";
import { GroupedTokenHeader, NetworkRouteSelectItemDisplay } from "../Routes";

type Props = {
    item: GroupedTokenElement | NetworkElement
    direction: SwapDirection;
    hideTokenImages?: boolean;
    hideBalances?: boolean;
};

export const CollapsableHeader = ({
    item,
    direction,
    hideTokenImages,
    hideBalances,
}: Props) => {
    const groupedByToken = item.type === "grouped_token";

    return groupedByToken ? (
        <GroupedTokenHeader
            item={item as GroupedTokenElement}
            direction={direction}
            hideTokenImages={hideTokenImages}
            hideBalances={hideBalances}
        />
    ) : (
        <NetworkRouteSelectItemDisplay
            item={(item as NetworkElement).route}
            selected={false}
            direction={direction}
            hideTokenImages={hideTokenImages}
            hideBalances={hideBalances}
        />
    );
};
