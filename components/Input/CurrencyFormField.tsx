import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useMemo } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { ISelectMenuItem, SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import CurrencySettings from "../../lib/CurrencySettings";
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
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import Image from 'next/image'
import { SelectMenuItemGroup } from "../Select/Command/commandSelect";
import { resolveNetworkRoutesURL } from "../../helpers/routes";
import useWallet from "../../hooks/useWallet";
import { Wallet } from "../../stores/walletStore";
import { useSettingsState } from "../../context/settings";
import { ONE_WEEK } from "./NetworkFormField";
import { ResolveNetworkOrder, SortingByAvailability } from "../../lib/sorting";
import ResolveRouteIcon from "./RouteIcon";
import { Exchange } from "../../Models/Exchange";
import NetworkSettings from "../../lib/NetworkSettings";

const BalanceComponent = dynamic(() => import("./dynamic/Balance"), {
    loading: () => <></>,
});

const GROUP_ORDERS = { "Selected Network": 1, "Top Assets": 2, "Popular": 3, "Networks": 10 };
const getGroupName = (value: RouteNetwork | Exchange | undefined, type: 'selected' | 'top', canShowInPopular?: boolean) => {
    if (value && NetworkSettings.KnownSettings[value.name]?.isFeatured && canShowInPopular) {
        return "Popular";
    }
    else if (type === 'selected') {
        return "Selected Network";
    }
    else if (type === 'top') {
        return "Top Assets";
    }
    else {
        return "Networks";
    }
}

const CurrencyFormField: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { destinationRoutes, sourceRoutes } = useSettingsState()
    const { wallets } = useWallet()
    const { to, fromCurrency, toCurrency, from, currencyGroup } = values
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const query = useQueryState()
    const { balances } = useBalancesState()

    const networkRoutesURL = resolveNetworkRoutesURL(direction, values)
    const apiClient = new LayerSwapApiClient()
    const {
        data: routes,
        isLoading,
        error
    } = useSWR<ApiResponse<RouteNetwork[]>>(`${networkRoutesURL}`, apiClient.fetcher, { keepPreviousData: true })

    const allCurrencies: ((RouteToken & { network_name: string, network_display_name: string, network_logo: string })[] | undefined) = routes?.data?.map(route =>
        route.tokens.map(asset => ({ ...asset, network_display_name: route.display_name, network_name: route.name, network_logo: route.logo }))).flat()

    const currencyMenuItems = GenerateCurrencyMenuItems(
        allCurrencies!,
        values,
        routes?.data,
        direction,
        balances,
        query,
        wallets,
        error
    )

    const neyworkGroupedCurrencies = GenerateGroupedCurrencyMenuItems(
        allCurrencies!,
        values,
        routes?.data,
        direction,
        balances,
        query,
        wallets,
        error
    );

    const currencyAsset = direction === 'from' ? fromCurrency?.symbol : toCurrency?.symbol;
    const currencyNetwork = allCurrencies?.find(c => c.symbol === currencyAsset && c.network_name === from?.name)?.network_name

    useEffect(() => {
        if (direction !== "to") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.symbol === currencyAsset)

        if (currencyIsAvailable) return

        const default_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.toAsset)?.toUpperCase() && c.baseObject.status === "active" && c.baseObject.network_name === to?.name)
            || currencyMenuItems?.find(c => c.baseObject.status === "active" && c.baseObject.network_name === to?.name)

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === fromCurrency?.symbol?.toUpperCase() && c.baseObject.status === "active" && c.baseObject.network_name === to?.name)

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
            c.baseObject?.symbol?.toUpperCase() === (query?.fromAsset)?.toUpperCase() && c.baseObject.status === "active" && c.baseObject.network_name === from?.name)
            || currencyMenuItems?.find(c => c.baseObject.status === "active" && c.baseObject.network_name === from?.name)

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === toCurrency?.symbol?.toUpperCase() && c.baseObject.status === "active" && c.baseObject.network_name === from?.name)

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

    const value = currencyMenuItems?.find(x => x.baseObject.symbol == currencyAsset && x.baseObject.network_name === currencyNetwork);

    const handleSelect = useCallback((item: SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }>) => {
        const network = (direction === 'from' ? sourceRoutes : destinationRoutes)?.find(r => r.name === item?.name || r.name === item?.baseObject?.network_name)
        setFieldValue(name, item.baseObject, true)
        setFieldValue(direction, network, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    return (
        <div className="relative">
            <BalanceComponent values={values} direction={direction} />
            <CommandSelectWrapper
                disabled={(value && !value?.isAvailable) || isLoading}
                valueGrouper={groupByType}
                placeholder="Asset"
                setValue={handleSelect}
                value={value}
                values={currencyMenuItems}
                groupedCurrencies={neyworkGroupedCurrencies}
                searchHint='Search'
                isLoading={isLoading}
            />
        </div>
    )
};

function groupByType(values: ISelectMenuItem[]) {
    let groups: SelectMenuItemGroup[] = [];
    values?.forEach((v) => {
        let group = groups.find(x => x.name == v.group) || new SelectMenuItemGroup({ name: v.group, items: [] });
        group.items.push(v);
        if (!groups.find(x => x.name == v.group)) {
            groups.push(group);
        }
    });

    groups.sort((a, b) => {
        return GROUP_ORDERS[a.name] - GROUP_ORDERS[b.name];
    });

    return groups;
}

function GenerateCurrencyMenuItems(
    currencies: (RouteToken & { network_name: string, network_display_name: string, network_logo: string })[],
    values: SwapFormValues,
    routes: RouteNetwork[] | undefined,
    direction: string,
    balances?: { [address: string]: Balance[]; },
    query?: QueryParams,
    wallets?: Wallet[] | undefined,
    error?: ApiError,
): SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }>[] {
    const { to, from } = values
    const lockAsset = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    return currencies?.map(c => {
        const currency = c
        const displayName = currency.symbol;

        for (const key in balances) {
            if (!wallets?.some(wallet => wallet?.address === key)) {
                delete balances[key];
            }
        }

        const balancesArray = balances && Object.values(balances).flat();
        const balance = balancesArray?.find(b => b?.token === c?.symbol && b?.network === c.network_name)

        const formatted_balance_amount = balance ? Number(truncateDecimals(balance?.amount, c.precision)) : ''
        const balanceAmountInUsd = formatted_balance_amount ? (currency?.price_in_usd * formatted_balance_amount).toFixed(2) : undefined

        const DisplayNameComponent = <div className="flex flex-col">
            <span className="text-base text-primary-text">{displayName}</span>
            <div className="text-secondary-text text-xs flex">
                {c.network_logo && <Image
                    src={c.network_logo}
                    alt="Project Logo"
                    height="16"
                    width="16"
                    loading="eager"
                    className="rounded-md object-contain mr-1" />
                }
                <span>{c.network_display_name}</span>
            </div>
        </div>

        const isNewlyListed = new Date(c?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK;

        const currencyIsAvailable = !lockAsset &&
            (
                (currency?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
                !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || currency.status === 'inactive')
            );

        const routeNotFound = (currency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) || lockAsset;

        const badge = isNewlyListed ? (
            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
        ) : undefined;

        const details = wallets?.length ? (<p className="text-primary-text text-sm flex flex-col items-end">
            {Number(formatted_balance_amount) ?
                <span>{formatted_balance_amount}</span>
                :
                <span>-</span>
            }
            {balanceAmountInUsd ?
                <span className="text-secondary-text">${balanceAmountInUsd}</span>
                :
                null
            }
        </p>) : null

        const noWalletsConnectedText = !wallets?.length && (
            <div className="text-secondary-text text-xs">
                <span>Connect wallet</span>
                <br />
                <span>to see balance</span>
            </div>
        )

        const logo = c.logo && (
            <Image
                src={c.logo}
                alt="Project Logo"
                height="40"
                width="40"
                loading="eager"
                className="rounded-full object-contain"
            />
        )

        const network = routes?.find(r => r.name === currency.network_name);

        const res: SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }> = {
            baseObject: c,
            id: `${c?.symbol?.toLowerCase()}_${c?.network_name?.toLowerCase()}`,
            name: displayName || "-",
            menuItemLabel: DisplayNameComponent,
            balanceAmount: Number(formatted_balance_amount),
            order: CurrencySettings.KnownSettings[c.symbol]?.Order ?? 5,
            imgSrc: c.logo,
            isAvailable: currencyIsAvailable,
            group: getGroupName(network, (values?.from?.name === network?.name || values?.to?.name === network?.name) ? 'selected' : 'top', currencyIsAvailable && !routeNotFound),
            menuItemDetails: details,
            badge,
            icon: <ResolveRouteIcon direction={direction} isAvailable={currencyIsAvailable} routeNotFound={!!routeNotFound} />,
            noWalletsConnectedText,
            logo
        };

        return res
    }).sort(SortingByAvailability);
}

function GenerateGroupedCurrencyMenuItems(
    currencies: (RouteToken & { network_name: string, network_display_name: string, network_logo: string })[],
    values: SwapFormValues,
    routes: RouteNetwork[] | undefined,
    direction: string,
    balances?: { [address: string]: Balance[]; },
    query?: QueryParams,
    wallets?: Wallet[] | undefined,
    error?: ApiError,
): SelectMenuItemGroup[] {
    const { to, from } = values;

    const networkGroupedCurrencies: { [key: string]: SelectMenuItemGroup } = {};

    currencies?.forEach(currency => {
        const displayName = currency.symbol;

        for (const key in balances) {
            if (!wallets?.some(wallet => wallet?.address === key)) {
                delete balances[key];
            }
        }

        const network = routes?.find(r => r.name === currency.network_name);
        const networkLocked = direction === "from" ? !!(from && query?.lockFrom) : !!(to && query?.lockTo);

        const networkIsAvailable = !networkLocked &&
            (
                network?.tokens?.some(r => r.status === 'active' || r.status === 'not_found') ||
                !query?.lockAsset && !query?.lockFromAsset && !query?.lockToAsset && !query?.lockFrom && !query?.lockTo && !query?.lockNetwork && !query?.lockExchange && network?.tokens?.some(r => r.status !== 'inactive')
            );

        const networksRouteNotFound = networkIsAvailable && !network?.tokens?.some(r => r.status === 'active');

        const balancesArray = balances && Object.values(balances).flat();
        const balance = balancesArray?.find(b => b?.token === currency?.symbol && b?.network === currency.network_name);

        const formattedBalanceAmount = balance ? Number(truncateDecimals(balance?.amount, currency.precision)) : '';
        const balanceAmountInUsd = formattedBalanceAmount ? (currency?.price_in_usd * formattedBalanceAmount).toFixed(2) : undefined;

        const networkTokens = balancesArray?.filter(b => b?.network === network?.name);
        
        const networkBalanceInUsd = networkTokens
            ? networkTokens.reduce((acc, b) => {
                const token = network?.tokens?.find(t => t?.symbol === b?.token);
                const tokenPriceInUsd = token?.price_in_usd || 0;
                const tokenPrecision = token?.precision || 0;
                const formattedBalance = Number(truncateDecimals(b?.amount, tokenPrecision));
                return acc + (formattedBalance * tokenPriceInUsd);
            }, 0).toFixed(2)
            : 0;

        const DisplayNameComponent = (
            <div className="flex flex-col">
                <span className="text-base text-primary-text">{displayName}</span>
                <div className="text-secondary-text text-xs flex">
                    {currency.network_logo && (
                        <Image
                            src={currency.network_logo}
                            alt="Project Logo"
                            height="16"
                            width="16"
                            loading="eager"
                            className="rounded-md object-contain mr-1"
                        />
                    )}
                    <span>{currency.network_display_name}</span>
                </div>
            </div>
        );

        const isNewlyListed = new Date(currency?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK;

        const currencyIsAvailable = (currency?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
            !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || currency.status === 'inactive');

        const badge = isNewlyListed ? (
            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
        ) : undefined;

        const details = wallets?.length ? (
            <p className="text-primary-text text-sm flex flex-col items-end pr-1.5">
                {Number(formattedBalanceAmount) ? <span>{formattedBalanceAmount}</span> : <span>-</span>}
                {balanceAmountInUsd ? <span className="text-secondary-text">${balanceAmountInUsd}</span> : null}
            </p>
        ) : null;

        const routeNotFound = currency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR;
        const groupName = getGroupName(network, (values?.from?.name === network?.name || values?.to?.name === network?.name) ? 'selected' : 'top', currencyIsAvailable && !routeNotFound)

        const res: SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }> = {
            baseObject: currency,
            id: `${currency?.symbol?.toLowerCase()}_${currency?.network_name?.toLowerCase()}`,
            name: displayName || "-",
            menuItemLabel: DisplayNameComponent,
            balanceAmount: Number(formattedBalanceAmount),
            order: CurrencySettings.KnownSettings[currency.symbol]?.Order ?? 5,
            imgSrc: currency.logo,
            isAvailable: currencyIsAvailable,
            menuItemDetails: details,
            group: groupName,
            badge,
            icon: ResolveRouteIcon({ direction, isAvailable: currencyIsAvailable, routeNotFound }),
            logo: (currency.logo && (
                <Image
                    src={currency.logo}
                    alt="Project Logo"
                    height="40"
                    width="40"
                    loading="eager"
                    className="rounded-full object-contain"
                />
            )
            ),
        };

        const networkLogo = (
            <div className="flex-shrink-0 h-9 w-9 relative">
                {network?.logo && (
                    <Image
                        src={network?.logo}
                        alt="Network Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className={`${network?.tokens?.length > 1 ? "rounded-md" : "rounded-full"} object-contain`}
                    />
                )}
            </div>
        );

        const networkIcon = ResolveRouteIcon({ direction, isAvailable: !!networkIsAvailable, routeNotFound: !!networksRouteNotFound }) || <></>

        if (!networkGroupedCurrencies[groupName]) {
            networkGroupedCurrencies[groupName] = { name: groupName, items: [] };
        }

        if (!networkGroupedCurrencies[groupName].items.find(c => c.id === network?.name) && network) {
            networkGroupedCurrencies[groupName].items.push({
                id: network.name,
                name: network.name,
                displayName: network.display_name,
                menuItemLabel: DisplayNameComponent,
                menuItemDetails: details,
                logo: networkLogo,
                balanceAmount: Number(networkBalanceInUsd),
                imgSrc: network.logo,
                isAvailable: !!networkIsAvailable,
                icon: networkIcon,
                subItems: [],
            });
        }

        networkGroupedCurrencies[groupName].items.find(c => c.id === network?.name)?.subItems?.push(res);
    });

    return Object.values(networkGroupedCurrencies)
}

export default CurrencyFormField