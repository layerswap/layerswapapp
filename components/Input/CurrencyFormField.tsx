import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { ISelectMenuItem, SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import CurrencySettings from "../../lib/CurrencySettings";
import { SortingByAvailability } from "../../lib/sorting";
import { Layer } from "../../Models/Layer";
import { useBalancesState } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useQueryState } from "../../context/query";
import { NetworkCurrency } from "../../Models/CryptoNetwork";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import useSWR from "swr";
import { ApiResponse } from "../../Models/ApiResponse";
import { Balance } from "../../Models/Balance";
import dynamic from "next/dynamic";
import { QueryParams } from "../../Models/QueryParams";
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { SelectMenuItemGroup } from "../Select/Command/commandSelect";
import { LayerIsAvailable } from "./NetworkFormField";
import { LayerDisabledReason } from "../Select/Popover/PopoverSelect";

const BalanceComponent = dynamic(() => import("./dynamic/Balance"), {
    loading: () => <></>,
});

const getGroupName = (value: NetworkCurrency, displayName: string | undefined, layerIsAvailable?: LayerIsAvailable) => {
    if (layerIsAvailable?.disabledReason !== LayerDisabledReason.InvalidRoute) {
        return displayName;
    }
    else {
        return "All networks";
    }
}

const CurrencyFormField: FC<{ direction: string }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { to, fromCurrency, toCurrency, from, currencyGroup, toExchange, fromExchange } = values
    const { resolveImgSrc, layers } = useSettingsState();
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const query = useQueryState()
    const { balances } = useBalancesState()
    const [walletAddress, setWalletAddress] = useState<string>()
    const lockAsset = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset
    const asset = direction === 'from' ? query?.fromAsset : query?.toAsset
    const currencies = direction === 'from' ? from?.assets : to?.assets;

    const sourceCurrencies = layers
        .map(layer =>
            layer.assets
                .filter(asset => asset.availableInSource)
                .map(asset => ({ ...asset, internalName: layer.internal_name }))
        )
        .flat();
    const destinationCurrencies = layers
        .map(layer =>
            layer.assets
                .filter(asset => asset.availableInDestination)
                .map(asset => ({ ...asset, internalName: layer.internal_name }))
        )
        .flat();

    const lockedCurrency = lockAsset
        ? currencies?.find(c => c?.asset?.toUpperCase() === (asset)?.toUpperCase())
        : undefined

    const apiClient = new LayerSwapApiClient()
    const version = LayerSwapApiClient.apiVersion

    const sourceRouteParams = new URLSearchParams({
        version,
        ...(toExchange && currencyGroup && currencyGroup.groupedInBackend ?
            {
                destination_asset_group: currencyGroup.name
            }
            : {
                ...(to && toCurrency &&
                {
                    destination_network: to.internal_name,
                    destination_asset: toCurrency?.asset
                })
            })
    });


    const destinationRouteParams = new URLSearchParams({
        version,
        ...(fromExchange && currencyGroup && currencyGroup.groupedInBackend ?
            {
                source_asset_group: currencyGroup.name
            }
            : {
                ...(from && fromCurrency &&
                {
                    source_network: from.internal_name,
                    source_asset: fromCurrency?.asset
                }
                )
            })
    });

    const sourceRoutesURL = `/routes/sources?${sourceRouteParams}`
    const destinationRoutesURL = `/routes/destinations?${destinationRouteParams}`

    const { data: sourceRoutes,
        error: sourceRoutesError,
        isLoading: sourceRoutesLoading
    } = useSWR<ApiResponse<{
        network: string;
        asset: string;
    }[]>>(sourceRoutesURL, apiClient.fetcher)

    const {
        data: destinationRoutes,
        error: destRoutesError,
        isLoading: destRoutesLoading
    } = useSWR<ApiResponse<{
        network: string;
        asset: string;
    }[]>>(destinationRoutesURL, apiClient.fetcher)

    const isLoading = sourceRoutesLoading || destRoutesLoading

    const filteredCurrencies = currencies?.filter(currency => {
        if (direction === "from") {
            return currency.availableInSource;
        } else {
            return currency.availableInDestination;
        }
    });

    const currencyMenuItems = GenerateCurrencyMenuItems(
        direction === "from" ? sourceCurrencies : destinationCurrencies,
        resolveImgSrc,
        values,
        direction === "from" ? sourceRoutes?.data : destinationRoutes?.data,
        direction,
        balances[walletAddress || ''],
        query
    )
    const currencyAsset = direction === 'from' ? fromCurrency?.asset : toCurrency?.asset;

    useEffect(() => {
        if (direction !== "to") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.asset === currencyAsset)

        if (currencyIsAvailable) return

        const default_currency = currencyMenuItems?.find(c =>
            c.baseObject?.asset?.toUpperCase() === (query?.toAsset)?.toUpperCase())
            || currencyMenuItems?.[0]

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.asset?.toUpperCase() === fromCurrency?.asset?.toUpperCase())

        if (selected_currency && destinationRoutes?.data?.filter(r => r.network === to?.internal_name)?.some(r => r.asset === selected_currency.name)) {
            setFieldValue(name, selected_currency.baseObject)
        }
        else if (default_currency) {
            setFieldValue(name, default_currency.baseObject)
        }
    }, [to, query])


    useEffect(() => {
        if (direction !== "from") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.asset === currencyAsset)

        if (currencyIsAvailable) return

        const default_currency = currencyMenuItems?.find(c =>
            c.baseObject?.asset?.toUpperCase() === (query?.fromAsset)?.toUpperCase())
            || currencyMenuItems?.[0]

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.asset?.toUpperCase() === toCurrency?.asset?.toUpperCase())

        if (selected_currency
            && sourceRoutes?.data
                ?.filter(r => r.network === from?.internal_name)
                ?.some(r => r.asset === selected_currency.name)) {
            setFieldValue(name, selected_currency.baseObject)
        }
        else if (default_currency) {
            setFieldValue(name, default_currency.baseObject)
        }
    }, [from, query])

    useEffect(() => {
        if (name === "toCurrency" && toCurrency) {
            if (destinationRoutes?.data
                && !destinationRoutes?.data
                    ?.filter(r => r.network === to?.internal_name)
                    ?.some(r => r.asset === toCurrency?.asset)) {
                setFieldValue(name, null)
            }
        }
    }, [fromCurrency, currencyGroup, name, to, destinationRoutes, destRoutesError,])

    useEffect(() => {
        if (name === "fromCurrency" && fromCurrency) {
            if (sourceRoutes?.data
                && !sourceRoutes?.data
                    ?.filter(r => r.network === from?.internal_name)
                    ?.some(r => r.asset === fromCurrency?.asset)) {
                setFieldValue(name, null)
            }
        }
    }, [toCurrency, currencyGroup, name, from, sourceRoutes, sourceRoutesError])

    const value = currencyMenuItems?.find(x => x.id == currencyAsset);

    const handleSelect = useCallback((item: SelectMenuItem<NetworkCurrency>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    return (
        <div className="relative">
            <BalanceComponent values={values} direction={direction} onLoad={(v) => setWalletAddress(v)} />
            <CommandSelectWrapper
                disabled={!value?.isAvailable?.value || isLoading}
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

function groupByType(values: ISelectMenuItem[]) {
    let groups: SelectMenuItemGroup[] = [];
    values?.forEach((v) => {
        let group = groups.find(x => x.name == v.group) || new SelectMenuItemGroup({ name: v.group, items: [] });
        group.items.push(v);
        if (!groups.find(x => x.name == v.group)) {
            groups.push(group);
        }
    });

    return groups;
}

export function GenerateCurrencyMenuItems(
    currencies: NetworkCurrency[],
    resolveImgSrc: (item: Layer | NetworkCurrency) => string,
    values: SwapFormValues,
    routes?: { network: string, asset: string }[],
    direction?: string,
    balances?: Balance[],
    query?: QueryParams): SelectMenuItem<NetworkCurrency>[] {
    const { to, from } = values
    const lockAsset = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    let currencyIsAvailable = (currency: NetworkCurrency) => {
        if (lockAsset) {
            return { value: false, disabledReason: CurrencyDisabledReason.LockAssetIsTrue }
        }
        else if ((from || to) && !routes?.filter(r => r.network === (direction === 'from' ? from?.internal_name : to?.internal_name)).some(r => r.asset === currency.asset)) {
            if (query?.lockAsset || query?.lockFromAsset || query?.lockToAsset) {
                return { value: false, disabledReason: CurrencyDisabledReason.InvalidRoute }
            }
            return { value: true, disabledReason: CurrencyDisabledReason.InvalidRoute }
        }
        else {
            return { value: true, disabledReason: null }
        }
    }

    return currencies?.map(c => {
        const currency = c
        const displayName = currency.display_asset ?? currency.asset;
        const balance = balances?.find(b => b?.token === c?.asset && (direction === 'from' ? from : to)?.internal_name === b.network)
        const formatted_balance_amount = balance ? Number(truncateDecimals(balance?.amount, c.precision)) : ''
        const balanceAmountInUsd = formatted_balance_amount ? (currency?.usd_price * formatted_balance_amount).toFixed(2) : undefined

        const res: SelectMenuItem<NetworkCurrency> = {
            baseObject: c,
            id: c.asset,
            name: displayName || "-",
            order: CurrencySettings.KnownSettings[c.asset]?.Order ?? 5,
            imgSrc: resolveImgSrc && resolveImgSrc(c),
            isAvailable: currencyIsAvailable(c),
            details: {
                balanceAmount: `${formatted_balance_amount}`,
                balanceAmountInUsd: balanceAmountInUsd
            },
            type: "currency",
            group: getGroupName(c, c.internalName),
            network: `${c?.asset?.toLowerCase()}_${c?.internalName?.toLowerCase()}`
        };

        return res
    }).sort(SortingByAvailability);
}

export enum CurrencyDisabledReason {
    LockAssetIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.',
    InvalidRoute = 'InvalidRoute'
}

export default CurrencyFormField