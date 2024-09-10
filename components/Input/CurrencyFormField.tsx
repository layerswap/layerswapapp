import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import { ResolveCurrencyOrder, SortAscending } from "../../lib/sorting";
import { useBalancesState } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useQueryState } from "../../context/query";
import { RouteNetwork, RouteToken } from "../../Models/Network";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import useSWR from "swr";
import { ApiResponse } from "../../Models/ApiResponse";
import { Balance } from "../../Models/Balance";
import dynamic from "next/dynamic";
import { QueryParams } from "../../Models/QueryParams";
import { ApiError, LSAPIKnownErrorCode } from "../../Models/ApiError";
import { resolveNetworkRoutesURL } from "../../helpers/routes";
import useWallet from "../../hooks/useWallet";
import { ONE_WEEK } from "./NetworkFormField";
import RouteIcon from "./RouteIcon";

const BalanceComponent = dynamic(() => import("./dynamic/Balance"), {
    loading: () => <></>,
});

const CurrencyFormField: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { to, fromCurrency, toCurrency, from, currencyGroup, destination_address } = values
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const query = useQueryState()
    const { balances } = useBalancesState()

    const { provider: destinationWalletProvider } = useWallet(to, 'autofil')
    const { provider: sourceWalletProvider } = useWallet(from, 'autofil')

    const address = direction === 'from' ? sourceWalletProvider?.activeWallet?.address : destination_address || destinationWalletProvider?.activeWallet?.address

    const networkRoutesURL = resolveNetworkRoutesURL(direction, values)
    const apiClient = new LayerSwapApiClient()
    const {
        data: routes,
        isLoading,
        error
    } = useSWR<ApiResponse<RouteNetwork[]>>(`${networkRoutesURL}`, apiClient.fetcher, { keepPreviousData: true })

    const currencies = direction === 'from' ? routes?.data?.find(r => r.name === from?.name)?.tokens : routes?.data?.find(r => r.name === to?.name)?.tokens;
    const currencyMenuItems = GenerateCurrencyMenuItems(
        currencies!,
        values,
        direction,
        balances[address || ''],
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
            setFieldValue(name, default_currency.baseObject, true)
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
            setFieldValue(name, default_currency.baseObject, true)
        }
    }, [from, query, routes])

    useEffect(() => {
        if (name === "toCurrency" && toCurrency && !isLoading && routes) {
            const value = routes.data?.find(r => r.name === to?.name)?.tokens?.find(r => r.symbol === toCurrency?.symbol)
            if (!value) return

            setFieldValue(name, value)
        }
    }, [fromCurrency, currencyGroup, name, to, routes, error, isLoading])

    useEffect(() => {
        if (name === "fromCurrency" && fromCurrency && !isLoading && routes) {
            const value = routes.data?.find(r => r.name === from?.name)?.tokens?.find(r => r.symbol === fromCurrency?.symbol)
            if (!value) return

            setFieldValue(name, value)
        }
    }, [toCurrency, currencyGroup, name, from, routes, error, isLoading])


    const handleSelect = useCallback((item: SelectMenuItem<RouteToken>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    const isLocked = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    return (
        <div className="relative">
            <BalanceComponent values={values} direction={direction} />
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
    currencies: RouteToken[],
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

        const routeNotFound = (currency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR);

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
            icon: <RouteIcon direction={direction} isAvailable={currencyIsAvailable} routeNotFound={!!routeNotFound} />
        };

        return res
    }).sort(SortAscending);
}

export default CurrencyFormField