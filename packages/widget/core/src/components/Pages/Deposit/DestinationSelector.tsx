import { FC, useEffect, useMemo } from "react";
import { useFormikContext } from "formik";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { TokenGroupedContent } from "@/components/Input/RoutePicker/TokenGroupedContent";
import { SelectedRouteDisplay } from "@/components/Input/RoutePicker/Routes";
import useDepositAddressDestinations from "@/hooks/useDepositAddressDestinations";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute } from "@layerswap/widget-types";
import { useHydrateSwapRouteHistory } from "@/stores/swapRouteHistoryStore";

type Props = {
    /** When true, render a static (non-interactive) badge — the destination is
     * controlled by the integrator via lockTo / lockToAsset and the user is
     * not allowed to change it. */
    locked?: boolean;
};

const DestinationSelector: FC<Props> = ({ locked }) => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    const { to, toAsset } = values || {};

    useHydrateSwapRouteHistory();

    const { data: destinationRoutesData } = useDepositAddressDestinations({ enabled: !locked });
    const isLoading = !locked && destinationRoutesData === undefined;

    const availableRoutes = useMemo<NetworkRoute[]>(() => {
        const routes = destinationRoutesData?.data;
        if (!routes) return [];
        return routes
            .map((route) => ({ ...route, tokens: route.tokens?.filter((t) => t.status === "active") ?? [] }))
            .filter((route) => route.tokens.length > 0);
    }, [destinationRoutesData]);

    const isEmpty = !locked && !isLoading && availableRoutes.length === 0;

    // Pre-populate the highest-ranked destination so downstream sub-flows have
    // something to use when the dropdown is enabled and no destination is set.
    useEffect(() => {
        if (locked) return;
        if (to && toAsset) return;
        if (availableRoutes.length === 0) return;
        const rank = (r: { destination_rank?: number }) => r.destination_rank ?? Number.POSITIVE_INFINITY;
        const tokenRank = (t: { destination_rank?: number }) => t.destination_rank ?? Number.POSITIVE_INFINITY;
        const defaultRoute = [...availableRoutes].sort((a, b) => rank(a) - rank(b))[0];
        if (!defaultRoute) return;
        const defaultToken = [...defaultRoute.tokens].sort((a, b) => tokenRank(a) - tokenRank(b))[0];
        if (!defaultToken) return;
        setFieldValue("to", defaultRoute, false);
        setFieldValue("toAsset", defaultToken, false);
    }, [locked, to, toAsset, availableRoutes, setFieldValue]);

    if (locked) {
        return (
            <div
                role="group"
                aria-disabled="true"
                title="Destination set by integrator"
                className="flex items-center bg-secondary-500 rounded-xl px-3 py-2 min-w-0"
            >
                <SelectedRouteDisplay
                    route={to}
                    token={toAsset}
                    placeholder="Select destination"
                />
            </div>
        );
    }

    if (isLoading) {
        return <div className="h-10 rounded-xl bg-secondary-500 animate-pulse" aria-hidden="true" />;
    }

    return (
        <Selector>
            <SelectorTrigger
                disabled={availableRoutes.length === 0}
                className="bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:outline-none"
            >
                <SelectedRouteDisplay
                    route={to}
                    token={toAsset}
                    placeholder={isEmpty ? "No destinations available" : "Select destination"}
                />
            </SelectorTrigger>
            <SelectorContent isLoading={false}>
                {({ closeModal }) => (
                    <TokenGroupedContent
                        routes={availableRoutes}
                        onSelect={(r, t) => {
                            setFieldValue("to", r, false);
                            setFieldValue("toAsset", t, true);
                            closeModal();
                        }}
                        direction="to"
                        selectedRoute={to?.name}
                        selectedToken={toAsset?.symbol}
                        hideTokenSwitch
                        hideBalances
                    />
                )}
            </SelectorContent>
        </Selector>
    );
};

export default DestinationSelector;
