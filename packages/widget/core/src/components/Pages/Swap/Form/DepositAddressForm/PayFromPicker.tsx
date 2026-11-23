import { FC } from "react";
import { NetworkRoute, Token } from "@layerswap/widget-types";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { TokenGroupedContent } from "@/components/Input/RoutePicker/TokenGroupedContent";
import useDepositAddressAvailableRoutes from "@/hooks/useDepositAddressAvailableRoutes";
import { useHydrateSwapRouteHistory } from "@/stores/swapRouteHistoryStore";
import { PayFromTriggerContent, payFromTriggerClassName } from "./PayFromTriggerView";

type PayFromPickerProps = {
    selectedSource: { network: NetworkRoute; token: Token } | null;
    onSourceChange: (network: NetworkRoute, token: Token) => void;
    destinationNetwork: string | undefined;
    destinationToken: string | undefined;
    hideDestinationPicker?: boolean;
}

const PayFromPicker: FC<PayFromPickerProps> = ({ selectedSource, onSourceChange, destinationNetwork, destinationToken, hideDestinationPicker }) => {
    useHydrateSwapRouteHistory();
    const { availableRoutes } = useDepositAddressAvailableRoutes(destinationNetwork, destinationToken);

    // Disable until the destination resolves a non-empty source list.
    const hasOptions = availableRoutes.length > 0;
    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);

    return (
        <div className="flex items-center gap-2">
            {!hideDestinationPicker && <span className="w-24 shrink-0 text-sm text-secondary-text tracking-wide">Send</span>}
            <div className="flex-1 min-w-0">
                <Selector>
                    <SelectorTrigger disabled={!hasOptions || !hasMultipleOptions} className={payFromTriggerClassName(hideDestinationPicker)}>
                        <PayFromTriggerContent selectedSource={selectedSource} hasMultipleOptions={hasMultipleOptions} hideDestinationPicker={hideDestinationPicker} />
                    </SelectorTrigger>
                    <SelectorContent isLoading={false}>
                        {({ closeModal }) => (
                            <TokenGroupedContent
                                routes={availableRoutes}
                                onSelect={(r, t) => { onSourceChange(r, t); closeModal(); }}
                                direction="from"
                                selectedRoute={selectedSource?.network.name}
                                selectedToken={selectedSource?.token.symbol}
                                hideTokenSwitch
                                hideBalances
                                hideConnectButton
                            />
                        )}
                    </SelectorContent>
                </Selector>
            </div>
        </div>
    );
};

export default PayFromPicker;
