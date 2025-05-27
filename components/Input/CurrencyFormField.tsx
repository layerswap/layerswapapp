import { useFormikContext } from "formik";
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useRef } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import { ResolveCurrencyOrder, SortAscending } from "../../lib/sorting";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useQueryState } from "../../context/query";
import { RouteNetwork, RouteToken } from "../../Models/Network";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import useSWR from "swr";
import { ApiResponse } from "../../Models/ApiResponse";
import { Balance } from "../../Models/Balance";
import { QueryParams } from "../../Models/QueryParams";
import { ApiError, LSAPIKnownErrorCode } from "../../Models/ApiError";
import { resolveNetworkRoutesURL } from "../../helpers/routes";
import { ONE_WEEK } from "./NetworkFormField";
import RouteIcon from "./RouteIcon";
import { useSwapDataState } from "../../context/swap";
import useSWRBalance from "../../lib/balances/useSWRBalance";
import { useSettingsState } from "../../context/settings";

const CurrencyFormField: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { from, to, fromCurrency, toCurrency, fromExchange, toExchange, destination_address, currencyGroup } = values
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const exchangeName = direction === 'from' ? 'fromExchange' : 'toExchange';
    const query = useQueryState()
    const { selectedSourceAccount } = useSwapDataState()
    const { destinationRoutes, sourceRoutes } = useSettingsState();

    const address = direction === 'from' ? (selectedSourceAccount?.address) : (destination_address)

    const { balance } = useSWRBalance(address, direction === 'from' ? from : to)

    const shouldFilter = direction === 'from' ? ((to && toCurrency) || (toExchange && currencyGroup)) : ((from && fromCurrency) || (fromExchange && currencyGroup))
    const networkRoutesURL = shouldFilter ? resolveNetworkRoutesURL(direction, values) : null

    const apiClient = new LayerSwapApiClient()
    const {
        data: routesFromQuery,
        isLoading,
        error
    } = useSWR<ApiResponse<RouteNetwork[]>>(networkRoutesURL, apiClient.fetcher, { keepPreviousData: true, fallbackData: { data: direction === 'from' ? sourceRoutes : destinationRoutes }, dedupingInterval: 10000 })

    const routes = (shouldFilter) ? routesFromQuery : (direction === 'from' ? { data: sourceRoutes } : { data: destinationRoutes })
    const currencies = direction === 'from' ? routes?.data?.find(r => r.name === from?.name)?.tokens : routes?.data?.find(r => r.name === to?.name)?.tokens;

    const currencyMenuItems = GenerateCurrencyMenuItems(
        currencies,
        routes,
        values,
        direction,
        balance || [],
        query,
        error
    )
    const currencyAsset = direction === 'from' ? fromCurrency?.symbol : toCurrency?.symbol;
    const value = currencyMenuItems?.find(x => x.id == currencyAsset);

    useEffect(() => {
        if (direction !== "to") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.symbol === currencyAsset)

        if (currencyIsAvailable) return


        const assetFromQuery = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.toAsset)?.toUpperCase())

        const isLocked = query?.lockToAsset

        const default_currency = assetFromQuery || (!isLocked && currencyMenuItems?.[0])

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === fromCurrency?.symbol?.toUpperCase())

        if (selected_currency && routes?.data?.find(r => r.name === to?.name)?.tokens?.some(r => r.symbol === selected_currency.name && r.status === 'active')) {
            setFieldValue(name, selected_currency.baseObject, true)
        }
        else if (default_currency) {
            (async () => {
                const resetFromCurrency = fromCurrency && !fromCurrency?.manuallySet && !query?.lockFromAsset && fromCurrency.symbol !== default_currency.baseObject.symbol
                    && (fromCurrency?.symbol !== default_currency.baseObject.symbol
                        || fromCurrency?.symbol.includes(default_currency.baseObject.symbol)
                        || default_currency.baseObject.symbol.includes(fromCurrency?.symbol)
                    )
                if (resetFromCurrency) {
                    const newFromCurrency = from?.tokens.find(t => t.symbol === default_currency.baseObject.symbol)
                        || from?.tokens.find(t => t.symbol.includes(default_currency.baseObject.symbol) || default_currency.baseObject.symbol.includes(t.symbol))
                    if (newFromCurrency) {
                        await setFieldValue("validatingDestination", true, true)
                        await setFieldValue("fromCurrency", newFromCurrency, true)
                    }
                }
                await setFieldValue(name, default_currency.baseObject, true)
            })()
        }
    }, [to, query, routes])

    useEffect(() => {
        if (direction !== "from") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.symbol === currencyAsset)

        if (currencyIsAvailable) return

        const assetFromQuery = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.fromAsset)?.toUpperCase())

        const isLocked = query?.lockFromAsset

        const default_currency = assetFromQuery || (!isLocked && currencyMenuItems?.[0])

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === toCurrency?.symbol?.toUpperCase())

        if (selected_currency
            && routes?.data
                ?.find(r => r.name === from?.name)?.tokens
                ?.some(r => r.symbol === selected_currency.name && r.status === 'active')) {
            setFieldValue(name, selected_currency.baseObject, true)
        }
        else if (default_currency) {
            (async () => {
                const resetToCurrency = toCurrency && !toCurrency?.manuallySet && !query?.lockFromAsset
                    && (toCurrency?.symbol !== default_currency.baseObject.symbol
                        || toCurrency?.symbol.includes(default_currency.baseObject.symbol)
                        || default_currency.baseObject.symbol.includes(toCurrency?.symbol)
                    )
                if (resetToCurrency) {
                    const newToCurrency = to?.tokens.find(t => t.symbol === default_currency.baseObject.symbol) && toCurrency?.symbol !== default_currency.baseObject.symbol
                        || to?.tokens.find(t => t.symbol.includes(default_currency.baseObject.symbol) || default_currency.baseObject.symbol.includes(t.symbol))
                    if (newToCurrency) {
                        await setFieldValue("validatingSource", true, true)
                        await setFieldValue("toCurrency", newToCurrency, true)
                    }
                }
                await setFieldValue(name, default_currency.baseObject, true)
            })()
        }
    }, [from, query, routes])

    useEffect(() => {
        if (name === "toCurrency" && toCurrency && !isLoading && routes) {
            (async () => {
                const value = routes.data?.find(r => r.name === to?.name)?.tokens?.find(r => r.symbol === toCurrency?.symbol)
                if (!value || value === toCurrency) return
                (value as any).manuallySet = toCurrency.manuallySet
                await setFieldValue(name, value)
                await setFieldValue("validatingDestination", false, true)
                await setFieldValue("validatingSource", false, true)
            })()
        }
    }, [fromCurrency, currencyGroup, name, to, routes, error, isLoading])

    useEffect(() => {
        if (name === "fromCurrency" && fromCurrency && !isLoading && routes) {
            (async () => {
                const value = routes.data?.find(r => r.name === from?.name)?.tokens?.find(r => r.symbol === fromCurrency?.symbol)
                if (!value || value === fromCurrency) return
                (value as any).manuallySet = fromCurrency.manuallySet
                await setFieldValue(name, value)
                await setFieldValue("validatingSource", false, true)
                await setFieldValue("validatingDestination", false, true)
            })()
        }
    }, [toCurrency, currencyGroup, name, from, routes, error, isLoading])

    const handleSelect = useCallback(async (item: SelectMenuItem<RouteToken>) => {
        const oppositeCurrency = direction === 'from' ? toCurrency : fromCurrency
        const exchange = direction === 'from' ? toExchange : fromExchange

        if (currencyGroup && !currencyGroup?.manuallySet) {
            const default_currency = exchange?.token_groups?.find(t => t.symbol === item.baseObject.symbol) || exchange?.token_groups?.find(t => t.symbol.includes(item.baseObject.symbol) || item.baseObject.symbol.includes(t.symbol))
            if (default_currency) {
                await setFieldValue("validatingCurrencyGroup", true, true)
                await setFieldValue("currencyGroup", default_currency, true)
                await setFieldValue(direction == "from" ? "validatingSource" : "validatingDestination", true, true)
            }
        }

        if (oppositeCurrency && !oppositeCurrency?.manuallySet && oppositeCurrency.symbol !== item.baseObject.symbol) {
            const network = direction === 'to' ? from : to

            const default_currency = network?.tokens?.find(t => t.symbol === item.baseObject.symbol) || network?.tokens?.find(t => t.symbol.includes(item.baseObject.symbol) || item.baseObject.symbol.includes(t.symbol))
            if (default_currency) {
                await setFieldValue("validatingDestination", true, true)
                await setFieldValue("validatingSource", true, true)
                await setFieldValue(`${direction == "from" ? "to" : "from"}Currency`, default_currency, true)
            }
        }
        (item.baseObject as any).manuallySet = true
        await setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to, values, currencyGroup])

    const isLocked = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    return (
        <div className="relative">
            <PopoverSelectWrapper
                placeholder="Asset"
                values={currencyMenuItems}
                value={value}
                setValue={handleSelect}
                disabled={isLoading || isLocked}
            />
        </div>
    )
};

function GenerateCurrencyMenuItems(
    currencies: RouteToken[] | undefined,
    routes: ApiResponse<RouteNetwork[]> | undefined,
    values: SwapFormValues,
    direction: string,
    balances?: Balance[],
    query?: QueryParams,
    error?: ApiError
): SelectMenuItem<RouteToken>[] {
    const { to, from } = values

    return currencies?.map(c => {
        const currency = c
        const displayName = currency.symbol;
        const balance = balances?.find(b => b?.token === c?.symbol && (direction === 'from' ? from : to)?.name === b.network)
        const formatted_balance_amount = balance ? Number(truncateDecimals(balance?.amount, c.precision)) : ''
        const isNewlyListed = new Date(c?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK;

        const currencyIsAvailable = (currency?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
            !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || currency.status === 'inactive')

        const badge = isNewlyListed ? (
            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
        ) : undefined;

        const details = <p className="text-primary-text-muted">
            {formatted_balance_amount}
        </p>

        const res: SelectMenuItem<RouteToken> = {
            baseObject: c,
            id: c.symbol,
            name: displayName || "-",
            order: ResolveCurrencyOrder(c, isNewlyListed),
            imgSrc: c.logo,
            isAvailable: currencyIsAvailable,
            badge,
            details,
            leftIcon: <RouteIcon direction={direction} isAvailable={currencyIsAvailable} routeNotFound={false} type="token" />
        };

        return res
    }).sort(SortAscending) || [];
}

export default CurrencyFormField