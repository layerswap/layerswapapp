import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useMemo } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import CurrencySettings from "../../lib/CurrencySettings";
import { SortingByOrder } from "../../lib/sorting";
import { Layer } from "../../Models/Layer";
import { useBalancesState } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useQueryState } from "../../context/query";
import { NetworkCurrency } from "../../Models/CryptoNetwork";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import useSWR from "swr";
import { ApiResponse } from "../../Models/ApiResponse";
import { Balance } from "../../hooks/useBalance";
import useWallet from "../../hooks/useWallet";

const CurrencyFormField: FC<{ direction: string }> = ({ direction }) => {
    const {
        values: { to, fromCurrency, toCurrency, from },
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { resolveImgSrc } = useSettingsState();
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency'
    const query = useQueryState()
    const { balances } = useBalancesState()
    const lockedCurrency = query?.lockAsset ? from?.assets?.find(c => c?.asset?.toUpperCase() === (query?.asset)?.toUpperCase()) : undefined
    const assets = direction === 'from' ? from?.assets : to?.assets;
    const { getAutofillProvider: getProvider } = useWallet()
    const provider = useMemo(() => {
        return from && getProvider(from)
    }, [from, getProvider])

    const wallet = provider?.getConnectedWallet()

    const filterWith = direction === "from" ? to : from
    const filterWithAsset = direction === "from" ? toCurrency?.asset : fromCurrency?.asset

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

    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : assets
    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies!,
        resolveImgSrc,
        direction === "from" ? sourceRoutes?.data : destinationRoutes?.data,
        lockedCurrency,
        from,
        to,
        direction,
        balances[wallet?.address || '']
    )

    const currencyAsset = direction === 'from' ? fromCurrency?.asset : toCurrency?.asset;
    useEffect(() => {
        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.asset === currencyAsset)

        if (currencyIsAvailable) return

        const default_currency = currencyMenuItems?.find(c => c.baseObject?.asset?.toUpperCase() === (query?.asset)?.toUpperCase()) || currencyMenuItems?.[0]

        if (default_currency) {
            setFieldValue(name, default_currency.baseObject)
        }
        else if (fromCurrency || toCurrency) {
            setFieldValue(name, null)
        }
    }, [from, to, fromCurrency, toCurrency, query])

    useEffect(() => {
        if (direction === "to" && fromCurrency) {
            if (!destinationRoutes?.data?.filter(r => r.network === to?.internal_name)?.some(r => r.asset === toCurrency?.asset)) {
                setFieldValue(name, fromCurrency)
            }
        }
    }, [fromCurrency, direction, to, destinationRoutes])

    useEffect(() => {
        if (direction === "from" && toCurrency) {
            if (!sourceRoutes?.data?.filter(r => r.network === from?.internal_name)?.some(r => r.asset === fromCurrency?.asset)) {
                setFieldValue(name, toCurrency)
            }
        }
    }, [toCurrency, direction, from, sourceRoutes])

    const value = currencyMenuItems?.find(x => x.id == currencyAsset);

    const handleSelect = useCallback((item: SelectMenuItem<NetworkCurrency>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])


    return <PopoverSelectWrapper placeholder="Asset" values={currencyMenuItems} value={value} setValue={handleSelect} disabled={!value?.isAvailable?.value} direction={direction} />;
};

export function GenerateCurrencyMenuItems(currencies: NetworkCurrency[], resolveImgSrc: (item: Layer | NetworkCurrency) => string, routes?: { network: string, asset: string }[], lockedCurrency?: NetworkCurrency, from?: Layer, to?: Layer, direction?: string, balances?: Balance[]): SelectMenuItem<NetworkCurrency>[] {

    let currencyIsAvailable = (currency: NetworkCurrency) => {
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

    return currencies?.map(c => {
        const currency = c
        const displayName = lockedCurrency?.asset ?? currency.asset;
        const balance = balances?.find(b => b?.token === c?.asset && from?.internal_name === b.network)
        const formatted_balance_amount = balance ? Number(truncateDecimals(balance?.amount, c.precision)) : ''

        const res: SelectMenuItem<NetworkCurrency> = {
            baseObject: c,
            id: c.asset,
            name: displayName || "-",
            order: CurrencySettings.KnownSettings[c.asset]?.Order ?? 5,
            imgSrc: resolveImgSrc && resolveImgSrc(c),
            isAvailable: currencyIsAvailable(c),
            details: `${formatted_balance_amount}`
        };
        return res
    }).sort(SortingByOrder);
}

export enum CurrencyDisabledReason {
    LockAssetIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.',
    InvalidRoute = 'Invalid route'
}

export default CurrencyFormField