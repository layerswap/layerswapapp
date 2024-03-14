import { useFormikContext } from "formik";
import { FC, useCallback, useEffect, useState } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import CurrencySettings from "../../lib/CurrencySettings";
import { SortingByAvailability } from "../../lib/sorting";
import { Layer } from "../../Models/Layer";
import { useBalancesState } from "../../context/balances";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useQueryState } from "../../context/query";
import { Token } from "../../Models/Network";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import useSWR from "swr";
import { ApiResponse } from "../../Models/ApiResponse";
import { Balance } from "../../Models/Balance";
import dynamic from "next/dynamic";
import { QueryParams } from "../../Models/QueryParams";

const BalanceComponent = dynamic(() => import("./dynamic/Balance"), {
    loading: () => <></>,
});

const CurrencyFormField: FC<{ direction: string }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { to, fromCurrency, toCurrency, from, currencyGroup, toExchange, fromExchange } = values
    const { resolveImgSrc, assetGroups } = useSettingsState();
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const query = useQueryState()
    const { balances } = useBalancesState()
    const [walletAddress, setWalletAddress] = useState<string>()
    const lockAsset = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset
    const asset = direction === 'from' ? query?.fromAsset : query?.toAsset
    const currencies = direction === 'from' ? from?.tokens : to?.tokens;

    const lockedCurrency = lockAsset
        ? currencies?.find(c => c?.symbol?.toUpperCase() === (asset)?.toUpperCase())
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
                    destination_network: to.name,
                    destination_asset: toCurrency?.symbol
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
                    source_network: from.name,
                    source_asset: fromCurrency?.symbol
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
            return currency.available_in_source;
        } else {
            return currency.available_in_destination;
        }
    });

    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies!,
        resolveImgSrc,
        values,
        direction === "from" ? sourceRoutes?.data : destinationRoutes?.data,
        direction,
        balances[walletAddress || ''],
        query
    )
    const currencyAsset = direction === 'from' ? fromCurrency?.symbol : toCurrency?.symbol;

    useEffect(() => {
        if (direction !== "to") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.symbol === currencyAsset)

        if (currencyIsAvailable) return

        const default_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.toAsset)?.toUpperCase())
            || currencyMenuItems?.[0]

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === fromCurrency?.symbol?.toUpperCase())

        if (selected_currency && destinationRoutes?.data?.filter(r => r.network === to?.name)?.some(r => r.asset === selected_currency.name)) {
            setFieldValue(name, selected_currency.baseObject)
        }
        else if (default_currency) {
            setFieldValue(name, default_currency.baseObject)
        }
    }, [to, query])


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
            && sourceRoutes?.data
                ?.filter(r => r.network === from?.name)
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
                    ?.filter(r => r.network === to?.name)
                    ?.some(r => r.asset === toCurrency?.symbol)) {
                setFieldValue(name, null)
            }
        }
    }, [fromCurrency, currencyGroup, name, to, destinationRoutes, destRoutesError,])

    useEffect(() => {
        if (name === "fromCurrency" && fromCurrency) {
            if (sourceRoutes?.data
                && !sourceRoutes?.data
                    ?.filter(r => r.network === from?.name)
                    ?.some(r => r.asset === fromCurrency?.symbol)) {
                setFieldValue(name, null)
            }
        }
    }, [toCurrency, currencyGroup, name, from, sourceRoutes, sourceRoutesError])

    const value = currencyMenuItems?.find(x => x.id == currencyAsset);

    const handleSelect = useCallback((item: SelectMenuItem<Token>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    return (
        <div className="relative">
            <BalanceComponent values={values} direction={direction} onLoad={(v) => setWalletAddress(v)} />
            <PopoverSelectWrapper
                placeholder="Asset"
                values={currencyMenuItems}
                value={value}
                setValue={handleSelect}
                disabled={!value?.isAvailable?.value || isLoading}
            />
        </div>
    )
};

export function GenerateCurrencyMenuItems(
    currencies: Token[],
    resolveImgSrc: (item: Layer | Token) => string,
    values: SwapFormValues,
    routes?: { network: string, asset: string }[],
    direction?: string,
    balances?: Balance[],
    query?: QueryParams): SelectMenuItem<Token>[] {
    const { to, from } = values
    const lockAsset = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    let currencyIsAvailable = (currency: Token) => {
        if (lockAsset) {
            return { value: false, disabledReason: CurrencyDisabledReason.LockAssetIsTrue }
        }
        else if ((from || to) && !routes?.filter(r => r.network === (direction === 'from' ? from?.name : to?.name)).some(r => r.asset === currency.symbol)) {
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
        const displayName = currency.symbol;
        const balance = balances?.find(b => b?.token === c?.symbol && (direction === 'from' ? from : to)?.name === b.network)
        const formatted_balance_amount = balance ? Number(truncateDecimals(balance?.amount, c.precision)) : ''

        const res: SelectMenuItem<Token> = {
            baseObject: c,
            id: c.symbol,
            name: displayName || "-",
            order: CurrencySettings.KnownSettings[c.symbol]?.Order ?? 5,
            imgSrc: resolveImgSrc && resolveImgSrc(c),
            isAvailable: currencyIsAvailable(c),
            details: `${formatted_balance_amount}`,
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