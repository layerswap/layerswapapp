import { useFormikContext } from "formik";
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useRef } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { ISelectMenuItem, SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
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
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { SelectMenuItemGroup } from "../Select/Command/commandSelect";
import Image from 'next/image'
import { Exchange } from "../../Models/Exchange";
import { Wallet } from "../../Models/WalletProvider";
import NetworkSettings from "../../lib/NetworkSettings";
import { groupBy } from "../utils/groupBy";
import CurrencySettings from "../../lib/CurrencySettings";
import useWallet from "../../hooks/useWallet";
import dynamic from "next/dynamic";
import { ExtendedAddress } from "./Address/AddressPicker/AddressWithIcon";
import { addressFormat } from "../../lib/address/formatter";


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

const WalletsHeader = dynamic(() => import("../Wallet/ConnectedWallets").then((comp) => comp.WalletsHeader), {
    loading: () => <></>
})

const CurrencyFormField: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { from, to, fromCurrency, toCurrency, fromExchange, toExchange, destination_address, currencyGroup } = values
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const exchangeName = direction === 'from' ? 'fromExchange' : 'toExchange';
    const query = useQueryState()
    const { wallets } = useWallet()
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

    const allCurrencies: ((RouteToken & { network_name: string, network_display_name: string, network_logo: string })[] | undefined) = routes?.data?.map(route =>
        route.tokens.map(asset => ({ ...asset, network_display_name: route.display_name, network_name: route.name, network_logo: route.logo }))).flat()

    const currencies = direction === 'from' ? routes?.data?.find(r => r.name === from?.name)?.tokens : routes?.data?.find(r => r.name === to?.name)?.tokens;

    const currencyMenuItems = GenerateCurrencyMenuItems(
        currencies,
        routes,
        values,
        routes?.data,
        direction,
        balance || [],
        query,
        wallets,
        error
    )

    const networkGroupedCurrencies = GenerateGroupedCurrencyMenuItems(
        values,
        routes?.data,
        direction,
        //balances,
        query,
        address,
        error
    );

    const currencyAsset = direction === 'from' ? fromCurrency?.symbol : toCurrency?.symbol;
    const currencyNetwork = allCurrencies?.find(c => c.symbol === currencyAsset && c.network_name === from?.name)?.network_name

    useEffect(() => {
        if (direction !== "to") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.symbol === currencyAsset)

        if (currencyIsAvailable) return


        const assetFromQuery = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.toAsset)?.toUpperCase())

        const isLocked = query?.lockToAsset

        const default_currency = assetFromQuery || (!isLocked && currencyMenuItems?.[0])

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === fromCurrency?.symbol?.toUpperCase() && c.baseObject.status === "active" && c.baseObject.network_name === to?.name)

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
            })()
        }
    }, [toCurrency, currencyGroup, name, from, routes, error, isLoading])

    const value = currencyMenuItems?.find(x => x.baseObject.symbol == currencyAsset && x.baseObject.network_name === currencyNetwork);
    const handleSelect = useCallback((item: SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }>) => {
        const network = (direction === 'from' ? sourceRoutes : destinationRoutes)?.find(r => r.name === item?.name || r.name === item?.baseObject?.network_name)
        setFieldValue(name, item.baseObject, true)
        setFieldValue(direction, network, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    const isLocked = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    return (
        <div className="relative">
            <CommandSelectWrapper
                disabled={(value && !value?.isAvailable) || isLoading}
                valueGrouper={groupByType}
                placeholder="Asset"
                setValue={handleSelect}
                value={value}
                values={currencyMenuItems!}
                groupedCurrencies={networkGroupedCurrencies}
                searchHint=''
                isLoading={isLoading}
                modalHeight="full"
                //valueDetails={valueDetails}
                //modalContent={networkDetails}
                //walletComp={<WalletsHeader />}
                key={value?.id}
            //header={header}
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
    currencies: RouteToken[] | undefined,
    routes: ApiResponse<RouteNetwork[]> | undefined,
    values: SwapFormValues,
    routes: RouteNetwork[] | undefined,
    direction: string,
    balances?: Balance[],
    query?: QueryParams,
    wallets?: Wallet[] | undefined,
    error?: ApiError
): SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }>[] {
    const { to, from } = values

    return currencies?.map(c => {
        const currency = c
        const displayName = currency.symbol;
        const balance = balances?.find(b => b?.token === c?.symbol && (direction === 'from' ? from : to)?.name === b.network)
        const formatted_balance_amount = balance ? Number(truncateDecimals(balance?.amount, c.precision)) : ''
        const isNewlyListed = new Date(c?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK;

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

        const noWalletsConnectedText = !wallets?.length && (
            <div className="text-secondary-text text-xs">
                <span>Connect wallet</span>
                <br />
                <span>to see balance</span>
            </div>
        )

        const currencyIsAvailable = (currency?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
            !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || currency.status === 'inactive')

        const badge = isNewlyListed ? (
            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
        ) : undefined;

        const details = <p className="text-primary-text-muted">
            {formatted_balance_amount}
        </p>

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
            name: displayName || "-",
            order: ResolveCurrencyOrder(c, isNewlyListed),
            group: getGroupName(network, (values?.from?.name === network?.name || values?.to?.name === network?.name) ? 'selected' : 'top', currencyIsAvailable && !routeNotFound),
            imgSrc: c.logo,
            isAvailable: currencyIsAvailable,
            noWalletsConnectedText,
            logo,
            extendedAddress,
            badge,
            details,
            leftIcon: <RouteIcon direction={direction} isAvailable={currencyIsAvailable} routeNotFound={false} type="token" />
        };

        return res
    }).sort(SortAscending) || [];
}

function GenerateGroupedCurrencyMenuItems(
    values: SwapFormValues,
    routes: RouteNetwork[] | undefined,
    direction: string,
    //balances?: Balance[],
    query?: QueryParams,
    address?: string | undefined,
    error?: ApiError,
    isBalanceLoading?: boolean,
): SelectMenuItemGroup[] {
    const { to, from } = values;

    const groupedRoutes = routes && groupBy(routes, route => {
        const network_currencies = route.tokens
        return getGroupName(route, (values?.from?.name === route?.name || values?.to?.name === route?.name) ? 'selected' : 'top', network_currencies.some(c => c.status === "active") && !address);
    });

    const res = groupedRoutes && Object.entries(groupedRoutes).map(([group, networks]) => {
        return {
            name: group,
            items: networks.map(network => {
                const details = (
                    <p className="text-primary-text text-sm flex flex-col items-end pr-1.5">
                        {network && address && <NetworkBalance address={address} network={network} />}
                    </p>
                )

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

                const networkIcon = <RouteIcon direction={direction} isAvailable={!!networkIsAvailable} routeNotFound={!!networksRouteNotFound} type="network" />
                const noWalletsConnectedText = !address && (
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
                    balanceAmount: details,
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

                        const currencyIsAvailable = (token?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
                            !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || token.status === 'inactive');
                        const details = (
                            <span className="text-primary-text text-sm flex flex-col items-end pr-1.5">
                                {token && address && <TokenBalance address={address} network={network} token={token} />}
                            </span>
                        )
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
                            order: CurrencySettings.KnownSettings[token.symbol]?.Order ?? 5,
                            imgSrc: token.logo,
                            isAvailable: currencyIsAvailable,
                            badge,
                            leftIcon: <RouteIcon direction={direction} isAvailable={currencyIsAvailable} routeNotFound={routeNotFound} type="token" />,
                            details,
                            logo: (token.logo && (
                                <Image
                                    src={token.logo}
                                    alt="Project Logo"
                                    height="36"
                                    width="36"
                                    loading="eager"
                                    className="rounded-full object-contain"
                                />
                            )),
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
type TokenBalanceProps = {
    network: RouteNetwork;
    address: string;
    token?: RouteToken;
}
const TokenBalance = (props: TokenBalanceProps) => {
    const { address, network, token } = props
    const { balance } = useSWRBalance(address, network)
    const tokenBalance = balance?.find(b => b?.network === network?.name && b?.token === token?.symbol)

    const formattedBalanceAmount = tokenBalance ? Number(truncateDecimals(tokenBalance?.amount, token?.precision)) : null;
    const balanceAmountInUsd = (formattedBalanceAmount && token) ? (token?.price_in_usd * formattedBalanceAmount) : null;

    return <span className="text-secondary-text">
        {(balanceAmountInUsd || balanceAmountInUsd === 0) ? (
            <span className="text-secondary-text">
                ${new Intl.NumberFormat("en-US", { style: "decimal" }).format(Number(balanceAmountInUsd.toFixed(2)))}
            </span>
        ) : (
            null
        )}
    </span>
}

const NetworkBalance = (props: TokenBalanceProps) => {
    const { address, network } = props
    const { balance } = useSWRBalance(address, network)

    const total_network_balance_in_usd = balance?.length
        ? balance.reduce((acc, b) => {
            const token = network?.tokens?.find(t => t?.symbol === b?.token);
            const tokenPriceInUsd = token?.price_in_usd || 0;
            const tokenPrecision = token?.precision || 0;
            const formattedBalance = Number(truncateDecimals(b?.amount, tokenPrecision));
            return acc + (formattedBalance * tokenPriceInUsd);
        }, 0)
        : undefined;

    return <span className="text-secondary-text">
        {(total_network_balance_in_usd || total_network_balance_in_usd === 0) ? (
            <span className="text-secondary-text">
                ${new Intl.NumberFormat("en-US", { style: "decimal" }).format(Number(total_network_balance_in_usd.toFixed(2)))}
            </span>
        ) : (
            null
        )}
    </span>
}
export default CurrencyFormField