import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import CurrencySettings from "../../lib/CurrencySettings";
import { SortingByAvailability, SortingByOrder } from "../../lib/sorting";
import { useQueryState } from "../../context/query";
import { groupBy } from "../utils/groupBy";
import { ApiResponse } from "../../Models/ApiResponse";
import useSWR from "swr";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import { NetworkCurrency } from "../../Models/CryptoNetwork";

const CurrencyGroupFormField: FC<{ direction: string }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const { to, fromCurrency, toCurrency, from, currencyGroup, toExchange, fromExchange } = values

    const { sourceRoutes: settingsSourceRoutes, destinationRoutes: settingsDestinationRoutes } = useSettingsState();
    const name = 'currencyGroup'

    const query = useQueryState()

    const routes = direction === 'from' ? settingsSourceRoutes : settingsDestinationRoutes
    const assets = routes && groupBy(routes, ({ asset }) => asset)
    const assetNames = assets && Object.keys(assets).map(a => ({ name: a, values: assets[a] }))
    const lockAsset = direction === 'from' ? query?.lockFromAsset : query?.lockToAsset
    const asset = direction === 'from' ? query?.fromAsset : query?.toAsset
    const lockedCurrency = lockAsset
        ? assetNames?.find(a => a.name.toUpperCase() === (asset)?.toUpperCase())
        : undefined

    const apiClient = new LayerSwapApiClient()
    const version = LayerSwapApiClient.apiVersion

    const sourceRouteParams = new URLSearchParams({
        version,
        ...(toExchange && currencyGroup ?
            { destination_asset_group: currencyGroup?.name }
            : {
                ...(to && toCurrency &&
                    { destination_network: to.internal_name, destination_asset: toCurrency?.asset }
                )
            })
    });

    const destinationRouteParams = new URLSearchParams({
        version,
        ...(fromExchange && currencyGroup ?
            { source_asset_group: currencyGroup?.name }
            : {
                ...(from && fromCurrency &&
                    { source_network: from.internal_name, source_asset: fromCurrency?.asset }
                )
            })
    });

    const sourceRoutesURL = `/routes/sources?${sourceRouteParams}`
    const destinationRoutesURL = `/routes/destinations?${destinationRouteParams}`

    const {
        data: sourceRoutes,
        isLoading: sourceRoutesLoading,
        error: sourceRoutesError,
    } = useSWR<ApiResponse<{
        network: string;
        asset: string;
    }[]>>(sourceRoutesURL, apiClient.fetcher)

    const {
        data: destinationRoutes,
        isLoading: destRoutesLoading,
        error: destRoutesError,
    } = useSWR<ApiResponse<{
        network: string;
        asset: string;
    }[]>>(destinationRoutesURL, apiClient.fetcher)

    const isLoading = sourceRoutesLoading || destRoutesLoading

    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : assetNames

    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies!,
        values,
        direction === "from" ? sourceRoutes?.data : destinationRoutes?.data,
        lockedCurrency,
    )

    const value = currencyMenuItems?.find(x => x.id == currencyGroup?.name);

    useEffect(() => {
        if (value) return
        setFieldValue(name, currencyMenuItems?.[0])
    }, [])

    const handleSelect = useCallback((item: SelectMenuItem<AssetGroup>) => {
        setFieldValue(name, item.baseObject, true)
        setFieldValue(`${name}Currency`, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    return <PopoverSelectWrapper
        placeholder="Asset"
        values={currencyMenuItems}
        value={value}
        setValue={handleSelect}
        disabled={!value?.isAvailable?.value || isLoading}
    />;
}

export function GenerateCurrencyMenuItems(
    currencies: AssetGroup[],
    values: SwapFormValues,
    routes?: { network: string, asset: string }[],
    lockedCurrency?: AssetGroup | undefined
): SelectMenuItem<AssetGroup>[] {
    const { fromExchange, toExchange } = values
    let currencyIsAvailable = (currency: AssetGroup) => {
        if (lockedCurrency) {
            return { value: false, disabledReason: CurrencyDisabledReason.LockAssetIsTrue }
        }
        else if ((fromExchange || toExchange) && !routes?.some(r => r.asset === currency.name)) {
            return { value: true, disabledReason: CurrencyDisabledReason.InvalidRoute }
        }
        else {
            return { value: true, disabledReason: null }
        }
    }

    const storageUrl = process.env.NEXT_PUBLIC_RESOURCE_STORAGE_URL

    return currencies?.map(c => {
        const currency = c
        const displayName = lockedCurrency?.name ?? currency.name;

        const res: SelectMenuItem<AssetGroup> = {
            baseObject: c,
            id: c.name,
            name: displayName || "-",
            order: CurrencySettings.KnownSettings[c.name]?.Order ?? 5,
            imgSrc: `${storageUrl}layerswap/currencies/${c.name.toLowerCase()}.png`,
            isAvailable: currencyIsAvailable(c),
            type: 'currency',
        };
        return res
    }).sort(SortingByAvailability);
}

export enum CurrencyDisabledReason {
    LockAssetIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.',
    InvalidRoute = 'Invalid route'
}

export type AssetGroup = {
    name: string;
    values: {
        network: string;
        asset: string;
    }[];
}

export default CurrencyGroupFormField