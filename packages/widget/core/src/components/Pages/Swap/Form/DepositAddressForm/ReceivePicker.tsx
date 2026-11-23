import { FC, useMemo } from "react";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import useDepositAddressDestinations from "@/hooks/useDepositAddressDestinations";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { SelectedRouteDisplay } from "@/components/Input/RoutePicker/Routes";
import { TokenGroupedContent } from "@/components/Input/RoutePicker/TokenGroupedContent";
import DestinationWalletPicker from "./DestinationWalletPicker";
import { useHydrateSwapRouteHistory } from "@/stores/swapRouteHistoryStore";

type ReceivePickerProps = {
    selectedDestination: { network: NetworkRoute; token: NetworkRouteToken } | null;
    onDestinationChange: (network: NetworkRoute, token: NetworkRouteToken) => void;
    destinationAddress: string | undefined;
    destination: NetworkRoute | undefined;
    /** Constrain the destination options to this route list instead of the full
     * deposit-address destination set. Used by the deposit widget, which only
     * ever offers the integrator's configured network and tokens. */
    routes?: NetworkRoute[];
    /** Hide the destination wallet picker (the selector then spans the full
     * row). Used when the recipient address is fixed by the caller — the
     * deposit widget locks it to the integrator's address, so there is no
     * wallet to choose. */
    hideWalletPicker?: boolean;
}

const ReceivePicker: FC<ReceivePickerProps> = ({
    selectedDestination,
    onDestinationChange,
    destinationAddress,
    destination,
    routes,
    hideWalletPicker,
}) => {
    useHydrateSwapRouteHistory();

    // Skip the network fetch entirely when the caller supplies a fixed route set.
    const { data: destinationRoutesData } = useDepositAddressDestinations({ enabled: !routes });

    const availableRoutes = useMemo(() => {
        const source = routes ?? destinationRoutesData?.data;
        if (!source) return [];
        return source
            .map(route => ({ ...route, tokens: route.tokens?.filter(t => t.status === 'active') ?? [] }))
            .filter(route => route.tokens.length > 0);
    }, [routes, destinationRoutesData]);

    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);

    return (
        <div className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-sm text-secondary-text tracking-wide">Receive</span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <Selector>
                        <SelectorTrigger disabled={!hasMultipleOptions} className="bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-3.5 py-3 transition-colors">
                            <SelectedRouteDisplay
                                route={selectedDestination?.network}
                                token={selectedDestination?.token}
                                placeholder="Select destination"
                            />
                        </SelectorTrigger>
                        <SelectorContent isLoading={false}>
                            {({ closeModal }) => (
                                <TokenGroupedContent
                                    routes={availableRoutes}
                                    onSelect={(r, t) => { onDestinationChange(r, t); closeModal(); }}
                                    direction="to"
                                    selectedRoute={selectedDestination?.network.name}
                                    selectedToken={selectedDestination?.token.symbol}
                                    hideTokenSwitch
                                    hideBalances
                                />
                            )}
                        </SelectorContent>
                    </Selector>
                </div>
                {!hideWalletPicker && (
                    <div className="flex-1 min-w-0">
                        <DestinationWalletPicker
                            address={destinationAddress}
                            destination={destination}
                            token={selectedDestination?.token}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReceivePicker;
