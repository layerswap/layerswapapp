import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
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
import ClickTooltip from "../Tooltips/ClickTooltip";
import useWallet from "../../hooks/useWallet";
import { ONE_WEEK } from "./NetworkFormField";
import useValidationErrorStore from "../validationError/validationErrorStore";
import validationMessageResolver from "../utils/validationErrorResolver";
import RouteIcon from "../icons/RouteIcon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";

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

    const { getAutofillProvider: getProvider } = useWallet()
    const { message: validationErrorMessage, directions, setValidationMessage, clearValidationMessage } = useValidationErrorStore()

    const sourceWalletProvider = useMemo(() => {
        return from && getProvider(from)
    }, [from, getProvider])

    const destinationWalletProvider = useMemo(() => {
        return to && getProvider(to)
    }, [to, getProvider])

    const address = direction === 'from' ? sourceWalletProvider?.getConnectedWallet(from)?.address : destination_address || destinationWalletProvider?.getConnectedWallet(to)?.address

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

        const default_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.toAsset)?.toUpperCase())
            || currencyMenuItems?.[0]

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

        const default_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.fromAsset)?.toUpperCase())
            || currencyMenuItems?.[0]

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

            if (value?.status === 'not_found') {
                const message = validationMessageResolver(values, direction, query, error)
                setValidationMessage('Route Unavailable', message, 'warning', name);
            } else {
                clearValidationMessage()
            }
            setFieldValue(name, value)
        }
    }, [fromCurrency, currencyGroup, name, to, routes, error, isLoading, validationErrorMessage])

    useEffect(() => {
        if (name === "fromCurrency" && fromCurrency && !isLoading && routes) {
            const value = routes.data?.find(r => r.name === from?.name)?.tokens?.find(r => r.symbol === fromCurrency?.symbol)
            if (!value) return

            if (value?.status === 'not_found') {
                const message = validationMessageResolver(values, direction, query, error)
                setValidationMessage('Route Unavailable', message, 'warning', name);
            } else {
                clearValidationMessage()
            }
            setFieldValue(name, value)
        }
    }, [toCurrency, currencyGroup, name, from, routes, error, isLoading, validationErrorMessage])


    const handleSelect = useCallback((item: SelectMenuItem<RouteToken>) => {
        setFieldValue(name, item.baseObject, true)
        const message = validationMessageResolver(values, direction, query, error)
        if (!item.isAvailable)
            setValidationMessage('Warning', message, 'warning', name);
        else
            clearValidationMessage()

    }, [name, direction, toCurrency, fromCurrency, from, to])


    return (
        <div className="relative">
            <BalanceComponent values={values} direction={direction} />
            <PopoverSelectWrapper
                placeholder="Asset"
                values={currencyMenuItems}
                value={value}
                setValue={handleSelect}
                disabled={!value?.isAvailable || isLoading}
            />
        </div>
    )
};

function GenerateCurrencyMenuItems(
    currencies: RouteToken[],
    values: SwapFormValues,
    direction?: string,
    balances?: Balance[],
    query?: QueryParams,
    error?: ApiError
): SelectMenuItem<RouteToken>[] {
    const { to, from } = values
    const lockAsset = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    return currencies?.map(c => {
        const currency = c
        const displayName = currency.symbol;
        const balance = balances?.find(b => b?.token === c?.symbol && (direction === 'from' ? from : to)?.name === b.network)
        const formatted_balance_amount = balance ? Number(truncateDecimals(balance?.amount, c.precision)) : ''
        const isNewlyListed = new Date(c?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK;

        const currencyIsAvailable = !lockAsset &&
            (
                (currency?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
                !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || currency.status === 'inactive')
            );
            
        const showRouteIcon = (currency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) || lockAsset;
        const badge = isNewlyListed ? (
            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
        ) : undefined;
        const rightIcon = c.status === 'inactive' ?
            <ClickTooltip side="left" text={`Transfers ${direction} this token are not available at the moment. Please try later.`} /> :
            <p className="text-primary-text-muted">
                {formatted_balance_amount}
            </p>

        const leftIcon = showRouteIcon ? (
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild >
                    <div className="absolute -left-0 z-50">
                        <RouteIcon className="!w-3 text-primary-text-placeholder hover:text-primary-text" />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-72">
                        Route unavailable
                    </p>
                </TooltipContent>
            </Tooltip>
        ) : undefined;

        const res: SelectMenuItem<RouteToken> = {
            baseObject: c,
            id: c.symbol,
            name: displayName || "-",
            order: ResolveCurrencyOrder(c, isNewlyListed),
            imgSrc: c.logo,
            isAvailable: currencyIsAvailable,
            rightIcon,
            badge,
            leftIcon
        };

        return res
    }).sort(SortAscending);
}

export default CurrencyFormField