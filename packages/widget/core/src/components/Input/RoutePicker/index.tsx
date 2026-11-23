import { useFormikContext } from "formik";
import { FC, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { SelectedRouteDisplay } from "./Routes";
import useFormRoutes, { useRouteElements } from "@/hooks/useFormRoutes";
import Balance from "../Amount/Balance";
import { Content } from "./Content";
import { NetworkRoute, Token } from "@layerswap/widget-types";
import { SwapQuote } from "@/lib/apiClients/layerSwapApiClient";
import { QuoteTokenPrices } from "@/hooks/useFee";
import PickerWalletConnect from "./RouterPickerWalletConnect";
import { swapInProgress } from "@/components/utils/swapUtils";
import { updateForm } from "@/components/Pages/Swap/Form/updateForm";
import clsx from "clsx";
import { SwapDirection, SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import useSuggestionsLimit from "@/hooks/useSuggestionsLimit";
import useWallet from "@/hooks/useWallet";
import { widgetTelemetry } from '@/lib/widgetTelemetry';

const RoutePicker: FC<{ direction: SwapDirection, isExchange?: boolean, className?: string, minAllowedAmount?: number, maxAllowedAmount?: number, quote?: SwapQuote, quoteTokenPrices?: QuoteTokenPrices, hideBalance?: boolean, onTriggerClick?: () => void }> = ({ direction, isExchange = false, className, minAllowedAmount, maxAllowedAmount, quote, quoteTokenPrices, hideBalance = false, onTriggerClick }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const ref = useRef<HTMLDivElement>(null);

    const { allRoutes, isLoading, selectedRoute, selectedToken } = useFormRoutes({ direction, values })
    const currencyFieldName = direction === 'from' ? 'fromAsset' : 'toAsset';

    useEffect(() => {
        const updateValues = async () => {
            if (!selectedRoute || !selectedToken || !allRoutes || swapInProgress.current) return;

            const updatedRoute = allRoutes.find(r => r.name === selectedRoute.name);
            const updatedToken = updatedRoute?.tokens?.find(t => t.symbol === selectedToken.symbol);

            if (direction === 'to' && updatedRoute && updatedRoute.refuel_asset !== selectedRoute.refuel_asset) {
                setFieldValue('to', updatedRoute, false)
            }

            if (updatedToken === selectedToken) return;

            if (updatedRoute && updatedToken) {
                await updateForm({
                    formDataKey: currencyFieldName,
                    formDataValue: updatedToken,
                    shouldValidate: true,
                    setFieldValue
                })
            }
        };

        updateValues();
    }, [selectedRoute, selectedToken, allRoutes, direction, setFieldValue]);

    const handleSelect = useCallback(async (route: NetworkRoute, token: Token) => {
        widgetTelemetry.interaction(direction === 'from' ? 'select_source_route' : 'select_destination_route', 'selection', true,
            { selected_network: route.name, selected_token: token.symbol })
        swapInProgress.current = false;
        await updateForm({
            formDataKey: currencyFieldName,
            formDataValue: token,
            shouldValidate: true,
            setFieldValue
        })
        await updateForm({
            formDataKey: direction,
            formDataValue: route,
            shouldValidate: true,
            setFieldValue
        })
    }, [currencyFieldName, direction])

    const showBalance = !hideBalance && !isExchange && (direction === 'to' || values.depositMethod === 'wallet')
    const triggerDataAttr = direction === "from" ? "from-route-picker" : "to-route-picker";
    const triggerClassName = "group-[.exchange-picker]:bg-secondary-500 py-1.5 px-2 group-[.exchange-picker]:py-2! group-[.exchange-picker]:px-3! active:animate-press-down group-[.exchange-picker]:active:animate-none";

    return (
        <div className={clsx("flex flex-col self-end relative items-center", className)}>
            {onTriggerClick ? (
                <div className="rounded-2xl flex items-center relative w-full z-10 self-end">
                    <button
                        type="button"
                        onClick={onTriggerClick}
                        data-attr={triggerDataAttr}
                        className={clsx("rounded-2xl focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative grow flex items-center text-left justify-bottom w-full px-2 pr-0 bg-secondary-300 hover:bg-secondary-200 font-semibold", triggerClassName)}
                    >
                        <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select token" />
                    </button>
                </div>
            ) : (
                <Selector>
                    <SelectorTrigger data-attr={triggerDataAttr} disabled={false} className={triggerClassName}>
                        <SelectedRouteDisplay route={selectedRoute} token={selectedToken} placeholder="Select token" />
                    </SelectorTrigger>
                    <SelectorContent
                        isLoading={isLoading}
                        searchHint="Search"
                        header={<PickerWalletConnect direction={direction} />}
                        ref={ref}
                    >
                        {({ closeModal }) => (
                            <PickerContent
                                routes={allRoutes}
                                direction={direction}
                                oppositeNetwork={direction === 'to' ? values.from?.name : values.to?.name}
                                onSelect={handleSelect}
                                closeModal={closeModal}
                                selectedRoute={selectedRoute?.name}
                                selectedToken={selectedToken?.symbol}
                            />
                        )}
                    </SelectorContent>
                </Selector>
            )}
            {
                showBalance &&
                <Balance values={values} direction={direction} minAllowedAmount={minAllowedAmount} maxAllowedAmount={maxAllowedAmount} quoteTokenPrices={quoteTokenPrices ?? quote} />
            }
        </div>
    )
};

type PickerContentProps = {
    routes: NetworkRoute[];
    direction: SwapDirection;
    oppositeNetwork: string | undefined;
    onSelect: (route: NetworkRoute, token: Token) => Promise<void>;
    closeModal: () => void;
    selectedRoute: string | undefined;
    selectedToken: string | undefined;
}

const PickerContent: FC<PickerContentProps> = ({ routes, direction, oppositeNetwork, onSelect, closeModal, selectedRoute, selectedToken }) => {
    const [searchQuery, setSearchQuery] = useState("")
    const deferredSearchQuery = useDeferredValue(searchQuery)
    const { wallets } = useWallet()
    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0 });
    const rowElements = useRouteElements({ routes, direction, oppositeNetwork, search: deferredSearchQuery, suggestionsLimit })

    return (
        <Content
            onSelect={(route, token) => { onSelect(route, token); closeModal(); }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            resultsQuery={deferredSearchQuery}
            rowElements={rowElements}
            direction={direction}
            selectedRoute={selectedRoute}
            selectedToken={selectedToken}
        />
    )
}

export default RoutePicker
