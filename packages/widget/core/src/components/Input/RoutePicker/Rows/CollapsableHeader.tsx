import { GroupedTokenElement, NetworkElement } from "@/Models/Route";
import { GroupedTokenHeader, NetworkRouteSelectItemDisplay } from "../Routes";
import { SwapDirection } from "@/components/Pages/Swap/Form/SwapFormValues";

type Props = {
    item: GroupedTokenElement | NetworkElement
    direction: SwapDirection;
    isOpen?: boolean;
    hideBalances?: boolean;
};

export const CollapsableHeader = ({
    item,
    direction,
    isOpen,
    hideBalances,
}: Props) => {
    const groupedByToken = item.type === "grouped_token";

    return groupedByToken ? (
        <GroupedTokenHeader
            item={item as GroupedTokenElement}
            direction={direction}
            isOpen={isOpen}
            hideBalances={hideBalances}
        />
    ) : (
        <NetworkRouteSelectItemDisplay
            item={(item as NetworkElement).route}
            selected={false}
            direction={direction}
            isOpen={isOpen}
            hideBalances={hideBalances}
        />
    );
};
