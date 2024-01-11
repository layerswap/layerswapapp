import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import CurrencySettings from "../../lib/CurrencySettings";
import { SortingByOrder } from "../../lib/sorting";
import { Layer } from "../../Models/Layer";
import { useQueryState } from "../../context/query";
import { NetworkCurrency } from "../../Models/CryptoNetwork";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import useSWR from "swr";
import { ApiResponse } from "../../Models/ApiResponse";
import { Balance } from "../../Models/Balance";
import { groupBy } from "../utils/groupBy";

const CurrencyGroupFormField: FC<{ direction: string }> = ({ direction }) => {
    const {
        values: { to, fromCurrency, toCurrency, from, currencyGroup },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { resolveImgSrc } = useSettingsState();
    const name = 'currencyGroup'

    const query = useQueryState()

    const apiClient = new LayerSwapApiClient()
    const version = LayerSwapApiClient.apiVersion

    const sourceRoutesURL = `/routes/sources${(to && toCurrency) ? `?destination_network=${to.internal_name}&destination_asset=${toCurrency.asset}&` : "?"}version=${version}`
    const destinationRoutesURL = `/routes/destinations${(from && fromCurrency) ? `?source_network=${from.internal_name}&source_asset=${fromCurrency.asset}&` : "?"}version=${version}`

    const { data: sourceRoutes } = useSWR<ApiResponse<{
        network: string,
        asset: string
    }[]>>(sourceRoutesURL, apiClient.fetcher)

    const { data: destinationRoutes } = useSWR<ApiResponse<{
        network: string,
        asset: string
    }[]>>(destinationRoutesURL, apiClient.fetcher)

    const routes = direction === 'from' ? sourceRoutes?.data : destinationRoutes?.data
    const assets = routes && groupBy(routes, ({ asset }) => asset)
    const assetNames = assets && Object.keys(assets).map(a => ({ name: a, networks: assets[a] }))
    const lockedCurrency = query?.lockAsset ? assetNames?.find(a => a.name.toUpperCase() === (query?.asset)?.toUpperCase()) : undefined

    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : assetNames
    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies!,
        resolveImgSrc,
        direction === "from" ? sourceRoutes?.data : destinationRoutes?.data,
        lockedCurrency,
        from,
        to,
        direction,
    )

    const value = currencyMenuItems?.find(x => x.id == currencyGroup?.name);

    useEffect(() => {
        if (value) return
        setFieldValue(name, currencyMenuItems?.[0])
    }, [])

    const handleSelect = useCallback((item: SelectMenuItem<AssetGroup>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])


    return <PopoverSelectWrapper placeholder="Asset" values={currencyMenuItems} value={value} setValue={handleSelect} disabled={!value?.isAvailable?.value} />;
};

export function GenerateCurrencyMenuItems(currencies: AssetGroup[], resolveImgSrc: (item: Layer | NetworkCurrency | undefined) => string, routes?: { network: string, asset: string }[], lockedCurrency?: AssetGroup | undefined, from?: Layer, to?: Layer, direction?: string, balances?: Balance[]): SelectMenuItem<AssetGroup>[] {

    let currencyIsAvailable = () => {
        if (lockedCurrency) {
            return { value: false, disabledReason: CurrencyDisabledReason.LockAssetIsTrue }
        }
        // else if (from && to && routes?.some(r => r.asset !== currency.asset && r.network !== (direction === 'from' ? from.internal_name : to.internal_name))) {
        //     return { value: false, disabledReason: CurrencyDisabledReason.InvalidRoute }
        // }
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
            isAvailable: currencyIsAvailable(),
            type: 'currency'
        };
        return res
    }).sort(SortingByOrder);
}

export enum CurrencyDisabledReason {
    LockAssetIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.',
    InvalidRoute = 'Invalid route'
}

export type AssetGroup = {
    name: string;
    networks: {
        network: string;
        asset: string;
    }[];
}

export default CurrencyGroupFormField