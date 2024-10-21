import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
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
import { SortingByAvailability } from "../../lib/sorting";
import ResolveRouteIcon from "./RouteIcon";
import { Exchange } from "../../Models/Exchange";
import NetworkSettings from "../../lib/NetworkSettings";
import { ExtendedAddress } from "./Address/AddressPicker/AddressWithIcon";
import { addressFormat } from "../../lib/address/formatter";
import { groupBy } from "../utils/groupBy";
import { Console } from "console";

const WalletsHeader = dynamic(() => import("../ConnectedWallets").then((comp) => comp.WalletsHeader), {
    loading: () => <></>
})

const BalanceComponent = dynamic(() => import("./dynamic/Balance"), {
    loading: () => <></>,
});

const GROUP_ORDERS = { "Selected Network": 1, "Top Assets": 2, "Popular": 3, "Networks": 10 };
const getGroupName = (value: RouteNetwork | Exchange | undefined, type: 'selected' | 'top', canShowInPopular?: boolean) => {
    if (type === 'selected') {
        return "Selected Network";
    }
    else if (value && NetworkSettings.KnownSettings[value.name]?.isFeatured && canShowInPopular) {
        return "Popular";
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
    const { balances, isBalanceLoading } = useBalancesState()

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

    const networkGroupedCurrencies = GenerateGroupedCurrencyMenuItems(
        values,
        routes?.data,
        direction,
        balances,
        query,
        wallets,
        error,
        isBalanceLoading
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
                groupedCurrencies={networkGroupedCurrencies}
                searchHint='Search'
                isLoading={isLoading}
                walletComp={<WalletsHeader />}
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

        const currencyIsAvailable = (currency?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
            !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || currency.status === 'inactive')

        const routeNotFound = (currency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR);

        const badge = isNewlyListed ? (
            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
        ) : undefined;

        const details = wallets?.length ? (<p className="text-primary-text text-sm flex flex-col items-end">
            {Number(formatted_balance_amount) ?
                <span>{Number(formatted_balance_amount).toFixed(2)}</span>
                :
                <span>0</span>
            }
            {balanceAmountInUsd ?
                <span className="text-secondary-text">${balanceAmountInUsd}</span>
                :
                <span>$0</span>
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
        const extendedAddress = (network && c.contract) && <ExtendedAddress address={addressFormat(c.contract, network)} network={network} isForCurrency={true} />

        const res: SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }> = {
            baseObject: c,
            id: `${c?.symbol?.toLowerCase()}_${c?.network_name?.toLowerCase()}`,
            displayName,
            name: displayName || "-",
            menuItemLabel: DisplayNameComponent,
            balanceAmount: Number(formatted_balance_amount),
            order: CurrencySettings.KnownSettings[c.symbol]?.Order ?? 5,
            imgSrc: c.logo,
            isAvailable: currencyIsAvailable,
            group: getGroupName(network, (values?.from?.name === network?.name || values?.to?.name === network?.name) ? 'selected' : 'top', currencyIsAvailable && !routeNotFound),
            menuItemDetails: details,
            badge,
            leftIcon: ResolveRouteIcon({ direction, isAvailable: currencyIsAvailable, routeNotFound, type: 'token' }),
            noWalletsConnectedText,
            logo,
            extendedAddress
        };

        return res
    }).sort(SortingByAvailability);
}

function GenerateGroupedCurrencyMenuItems(
    values: SwapFormValues,
    routes: RouteNetwork[] | undefined,
    direction: string,
    balances?: { [address: string]: Balance[]; },
    query?: QueryParams,
    wallets?: Wallet[] | undefined,
    error?: ApiError,
    isBalanceLoading?: boolean,
): SelectMenuItemGroup[] {
    const { to, from } = values;

    const groupedRoutes = routes && groupBy(routes, route => {
        const network_currencies = route.tokens
        return getGroupName(route, (values?.from?.name === route?.name || values?.to?.name === route?.name) ? 'selected' : 'top', network_currencies.some(c => c.status === "active") && !wallets?.length);
    });

    const res = groupedRoutes && Object.entries(groupedRoutes).map(([group, networks]) => {
        return {
            name: group,
            items: networks.map(network => {
                const balancesArray = balances && Object.values(balances).flat();
                const networkbalances = balancesArray?.filter(b => b?.network === network.name);

                const total_network_balance_in_usd = networkbalances?.length
                    ? networkbalances.reduce((acc, b) => {
                        const token = network?.tokens?.find(t => t?.symbol === b?.token);
                        const tokenPriceInUsd = token?.price_in_usd || 0;
                        const tokenPrecision = token?.precision || 0;
                        const formattedBalance = Number(truncateDecimals(b?.amount, tokenPrecision));
                        return acc + (formattedBalance * tokenPriceInUsd);
                    }, 0)
                    : undefined;

                const networkLogo = (
                    <div className="flex-shrink-0 h-9 w-9 relative">
                        {network?.logo && (
                            <Image
                                src={network?.logo}
                                alt="Network Logo"
                                height="40"
                                width="40"
                                loading="eager"
                                className="rounded-md object-contain"
                            />
                        )}
                    </div>
                );
                const networkLocked = direction === "from" ? !!(from && query?.lockFrom) : !!(to && query?.lockTo);

                const networkIsAvailable = !networkLocked &&
                    (
                        network?.tokens?.some(r => r.status === 'active' || r.status === 'not_found') ||
                        !query?.lockAsset && !query?.lockFromAsset && !query?.lockToAsset && !query?.lockFrom && !query?.lockTo && !query?.lockNetwork && !query?.lockExchange && network?.tokens?.some(r => r.status !== 'inactive')
                    );
                const networksRouteNotFound = networkIsAvailable && !network?.tokens?.some(r => r.status === 'active');

                const networkIcon = ResolveRouteIcon({ direction, isAvailable: !!networkIsAvailable, routeNotFound: !!networksRouteNotFound, type: "token" }) || <></>
                const noWalletsConnectedText = !wallets?.length && (
                    <div className="text-secondary-text text-xs">
                        <span>Connect wallet</span>
                        <br />
                        <span>to see balance</span>
                    </div>
                )

                const res = {
                    id: network.name,
                    name: network.name,
                    displayName: network.display_name,
                    logo: networkLogo,
                    balanceAmount: total_network_balance_in_usd,
                    imgSrc: network.logo,
                    isAvailable: !!networkIsAvailable,
                    leftIcon: networkIcon,
                    subItems: network.tokens.map(token => {
                        const displayName = token.symbol
                        const DisplayNameComponent = (
                            <div className="flex flex-col">
                                <span className="text-base text-primary-text">{displayName}</span>
                                <div className="text-secondary-text text-xs flex">
                                    {network.logo && (
                                        <Image
                                            src={network.logo}
                                            alt="Project Logo"
                                            height="16"
                                            width="16"
                                            loading="eager"
                                            className="rounded-md object-contain mr-1"
                                        />
                                    )}
                                    <span>{network.display_name}</span>
                                </div>
                            </div>
                        );
                        const token_balance = networkbalances?.find(b => b?.token === token?.symbol);

                        const formattedBalanceAmount = token_balance ? Number(truncateDecimals(token_balance?.amount, token.precision)) : null;
                        const balanceAmountInUsd = formattedBalanceAmount ? (token?.price_in_usd * formattedBalanceAmount) : null;
                        const currencyIsAvailable = (token?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
                            !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || token.status === 'inactive');
                        const details = wallets?.length ? (
                            isBalanceLoading ? (
                                <div className='h-[20px] w-20 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                            ) : (
                                <p className="text-primary-text text-sm flex flex-col items-end pr-1.5">
                                    {(formattedBalanceAmount || formattedBalanceAmount === 0) ? <span>{formattedBalanceAmount.toFixed(2)}</span> : null}
                                    {(balanceAmountInUsd || balanceAmountInUsd === 0) ? (
                                        <span className="text-secondary-text">
                                            ${new Intl.NumberFormat("en-US", { style: "decimal" }).format(Number(balanceAmountInUsd.toFixed(2)))}
                                        </span>
                                    ) : (
                                        null
                                    )}
                                </p>
                            )
                        ) : null;
                        const isNewlyListed = new Date(token?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK;
                        const badge = isNewlyListed ? (
                            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
                        ) : undefined;
                        const routeNotFound = token?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR;
                        const extendedAddress = (network && token.contract) && <ExtendedAddress address={addressFormat(token.contract, network)} network={network} isForCurrency={true} />

                        const token_select_item: SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }> = {
                            baseObject: { ...token, network_name: network.name, network_display_name: network.display_name, network_logo: network.logo },
                            id: `${token?.symbol?.toLowerCase()}_${network.name?.toLowerCase()}`,
                            displayName,
                            name: displayName || "-",
                            menuItemLabel: DisplayNameComponent,
                            balanceAmount: Number(formattedBalanceAmount),
                            order: CurrencySettings.KnownSettings[token.symbol]?.Order ?? 5,
                            imgSrc: token.logo,
                            isAvailable: currencyIsAvailable,
                            menuItemDetails: details,
                            badge,
                            leftIcon: ResolveRouteIcon({ direction, isAvailable: currencyIsAvailable, routeNotFound, type: "token" }),
                            logo: (token.logo && (
                                <Image
                                    src={token.logo}
                                    alt="Project Logo"
                                    height="36"
                                    width="36"
                                    loading="eager"
                                    className="rounded-full object-contain"
                                />
                            )
                            ),
                            noWalletsConnectedText,
                            extendedAddress,
                            isBalanceLoading
                        };
                        return token_select_item
                    }),
                    noWalletsConnectedText
                };

                return res
            })
        }
    })
    return res || []
}

export default CurrencyFormField