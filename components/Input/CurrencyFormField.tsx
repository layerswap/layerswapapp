import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useMemo } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import CurrencySettings from "../../lib/CurrencySettings";
import { useBalancesState } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useQueryState } from "../../context/query";
import { Network, RouteNetwork, RouteToken } from "../../Models/Network";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";
import { SortingByAvailability } from "../../lib/sorting";
import { CircleAlert, RouteOff } from "lucide-react";
import RouteIcon from "./RouteIcon";

const BalanceComponent = dynamic(() => import("./dynamic/Balance"), {
    loading: () => <></>,
});

const getGroupName = (displayName: string | undefined) => {
    return displayName;
}

const CurrencyFormField: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { destinationRoutes, sourceRoutes } = useSettingsState()
    const { wallets } = useWallet()
    const { to, fromCurrency, toCurrency, from, currencyGroup, destination_address } = values
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const query = useQueryState()
    const { balances } = useBalancesState()

    const { getAutofillProvider: getProvider } = useWallet()

    const sourceWalletProvider = useMemo(() => {
        return from && getProvider(from)
    }, [from, getProvider])

    const destinationWalletProvider = useMemo(() => {
        return to && getProvider(to)
    }, [to, getProvider])

    const networkRoutesURL = resolveNetworkRoutesURL(direction, values)
    const apiClient = new LayerSwapApiClient()
    const {
        data: routes,
        isLoading,
        error
    } = useSWR<ApiResponse<RouteNetwork[]>>(`${networkRoutesURL}`, apiClient.fetcher, { keepPreviousData: true })

    const allCurrencies: ((RouteToken & { network_name: string, network_display_name: string, network_logo: string })[] | undefined) = direction === 'from' ?
        sourceRoutes?.map(route =>
            route.tokens.map(asset => ({ ...asset, network_display_name: route.display_name, network_name: route.name, network_logo: route.logo }))).flat()
        :
        destinationRoutes?.map(route =>
            route.tokens.map(asset => ({ ...asset, network_display_name: route.display_name, network_name: route.name, network_logo: route.logo }))).flat();

    const currencyMenuItems = GenerateCurrencyMenuItems(
        allCurrencies!,
        values,
        direction,
        balances,
        query,
        wallets,
        error
    )
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
        const network = (direction === 'from' ? sourceRoutes : destinationRoutes)?.find(r => r.name === item.baseObject.network_name)
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
                searchHint='Search'
                isLoading={isLoading}
            />
        </div>
    )
};

export function groupByType(values: SelectMenuItem<Network>[]) {
    let groups: SelectMenuItemGroup[] = [];
    values?.forEach((v) => {
        let group = groups.find(x => x.name == v.group) || new SelectMenuItemGroup({ name: v.group, items: [] });
        group.items.push(v);
        if (!groups.find(x => x.name == v.group)) {
            groups.push(group);
        }
    });

    groups.sort((a, b) => (a.name === "All networks" ? 1 : b.name === "All networks" ? -1 : a.name.localeCompare(b.name)));
    return groups;
}

function GenerateCurrencyMenuItems(
    currencies: (RouteToken & { network_name: string, network_display_name: string, network_logo: string })[],
    values: SwapFormValues,
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

        const DisplayNameComponent = <div>
            {displayName}
            <span className="text-primary-text-muted text-xs block">
                {c.network_display_name}
            </span>
        </div>

        const NetworkImage = <div>
            {c.network_logo && <div className="absolute w-2.5 -right-1 -bottom-0.5">
                <Image
                    src={c.network_logo}
                    alt="Project Logo"
                    height="40"
                    width="40"
                    loading="eager"
                    className="rounded-md object-contain" />
            </div>
            }
        </div>

        const isNewlyListed = new Date(c?.listing_date)?.getTime() >= new Date().getTime() - ONE_WEEK;

        const currencyIsAvailable = !lockAsset &&
            (
                (currency?.status === "active" && error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
                !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset || currency.status === 'inactive')
            );

        const routeNotFound = (currency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) || lockAsset;
        if (currency?.network_name === "SOLANA_MAINNET")
            console.log(currency,"solana")
        const badge = isNewlyListed ? (
            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
        ) : undefined;

        const details = <p className="text-primary-text-placeholder flex flex-col items-end">
            {Number(formatted_balance_amount) ?
                <span className="text-primary-text text-sm">{formatted_balance_amount}</span>
                :
                <span className="text-primary-text text-sm">0.00</span>
            }
            {balanceAmountInUsd ?
                <span className="text-sm">${balanceAmountInUsd}</span>
                :
                <span className="text-sm">$0.00</span>
            }
        </p>

        const res: SelectMenuItem<RouteToken & { network_name: string, network_display_name: string, network_logo: string }> = {
            baseObject: c,
            id: `${c?.symbol?.toLowerCase()}_${c?.network_name?.toLowerCase()}`,
            name: displayName || "-",
            menuItemLabel: DisplayNameComponent,
            menuItemImage: NetworkImage,
            balanceAmount: Number(formatted_balance_amount),
            order: CurrencySettings.KnownSettings[c.symbol]?.Order ?? 5,
            imgSrc: c.logo,
            isAvailable: currencyIsAvailable,
            group: getGroupName(c.network_display_name === (direction === "from" ? from?.display_name : to?.display_name) ? c.network_display_name : "All networks"),
            menuItemDetails: details,
            badge,
            icon: <RouteIcon direction={direction} isAvailable={currencyIsAvailable} routeNotFound={!!routeNotFound} />
        };

        return res
    }).sort(SortingByAvailability);
}

export default CurrencyFormField