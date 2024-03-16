import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import CurrencySettings from "../../lib/CurrencySettings";
import { SortingByAvailability } from "../../lib/sorting";
import { useQueryState } from "../../context/query";
import { ApiResponse } from "../../Models/ApiResponse";
import useSWR from "swr";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { groupByType } from "./CurrencyFormField";

const CurrencyGroupFormField: FC<{ direction: string }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const { to, fromCurrency, toCurrency, from, currencyGroup, toExchange, fromExchange } = values

    const { sourceRoutes: settingsSourceRoutes, destinationRoutes: settingsDestinationRoutes, assetGroups, resolveImgSrc } = useSettingsState();
    const name = 'currencyGroup'

    const query = useQueryState()

    const routes = direction === 'from' ? settingsSourceRoutes : settingsDestinationRoutes

    const availableAssetGroups = assetGroups.filter(g => g.values.some(v => routes.some(r => r.asset === v.asset && r.network === v.network)))

    const lockAsset = direction === 'from' ? query?.lockFromAsset : query?.lockToAsset
    const asset = direction === 'from' ? query?.fromAsset : query?.toAsset
    const lockedCurrency = lockAsset
        ? availableAssetGroups?.find(a => a.name.toUpperCase() === (asset)?.toUpperCase())
        : undefined

    const apiClient = new LayerSwapApiClient()
    const version = LayerSwapApiClient.apiVersion

    const sourceRouteParams = new URLSearchParams({
        version,
        ...(toExchange && currencyGroup && currencyGroup?.groupedInBackend ?
            {
                destination_asset_group: currencyGroup?.name
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
        ...(fromExchange && currencyGroup && currencyGroup?.groupedInBackend ?
            {
                source_asset_group: currencyGroup?.name
            }
            : {
                ...(from && fromCurrency &&
                {
                    source_network: from.internal_name,
                    source_asset: fromCurrency?.asset
                })
            })
    });

    const sourceRoutesURL = `/routes/sources?${sourceRouteParams}`
    const destinationRoutesURL = `/routes/destinations?${destinationRouteParams}`

    const {
        data: sourceRoutes,
        isLoading: sourceRoutesLoading,
    } = useSWR<ApiResponse<{
        network: string;
        asset: string;
    }[]>>(sourceRoutesURL, apiClient.fetcher)

    const {
        data: destinationRoutes,
        isLoading: destRoutesLoading,
    } = useSWR<ApiResponse<{
        network: string;
        asset: string;
    }[]>>(destinationRoutesURL, apiClient.fetcher)

    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : availableAssetGroups
    const isLoading = sourceRoutesLoading || destRoutesLoading

    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies!,
        values,
        direction === "from" ? sourceRoutes?.data : destinationRoutes?.data,
        lockedCurrency,
    )

    const value = currencyMenuItems?.find(x => x.name == currencyGroup?.name);

    useEffect(() => {
        if (value) return
        setFieldValue(name, currencyMenuItems?.[0].baseObject)
    }, [])

    const handleSelect = useCallback((item: SelectMenuItem<AssetGroup>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    const valueDetails = <div>
        {value
            ?
            <span className="block font-medium text-primary-text flex-auto items-center">
                {value?.name}
            </span>
            :
            <span className="block font-medium text-primary-text-placeholder flex-auto items-center">
                Asset
            </span>}
    </div>


    return <CommandSelectWrapper
        disabled={!value?.isAvailable?.value || isLoading}
        valueGrouper={groupByType}
        placeholder="Asset"
        setValue={handleSelect}
        value={value}
        values={currencyMenuItems}
        searchHint='Search'
        isLoading={isLoading}
        valueDetails={valueDetails}
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
    const group = values?.fromExchange?.display_name

    return currencies?.map(c => {
        const currency = c
        const displayName = lockedCurrency?.name ?? currency.name;

        const res: SelectMenuItem<AssetGroup> = {
            baseObject: c,
            id: `${c?.name?.toLowerCase()}`,
            name: displayName || "-",
            order: CurrencySettings.KnownSettings[c.name]?.Order ?? 5,
            imgSrc: `${storageUrl}layerswap/currencies/${c.name.toLowerCase()}.png`,
            isAvailable: currencyIsAvailable(c),
            group,
        };
        return res
    }).sort(SortingByAvailability);
}

export enum CurrencyDisabledReason {
    LockAssetIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.',
    InvalidRoute = 'InvalidRoute'
}

export type AssetGroup = {
    name: string;
    values: {
        network: string;
        asset: string;
    }[];
    groupedInBackend: boolean
}

export default CurrencyGroupFormField