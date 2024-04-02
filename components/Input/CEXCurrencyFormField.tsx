import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import CurrencySettings from "../../lib/CurrencySettings";
import { SortingByAvailability } from "../../lib/sorting";
import { useQueryState } from "../../context/query";
import { ApiResponse } from "../../Models/ApiResponse";
import useSWR from "swr";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import { CryptoNetwork } from "../../Models/Network";
import { ExchangeToken } from "../../Models/Exchange";

const CurrencyGroupFormField: FC<{ direction: string }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const { to, fromCurrency, toCurrency, from, currencyGroup, toExchange, fromExchange } = values

    const name = 'currencyGroup'
    const query = useQueryState()

    const availableAssetGroups = (direction === 'from' ? fromExchange?.token_groups : toExchange?.token_groups)

    const lockAsset = direction === 'from' ? query?.lockFromAsset : query?.lockToAsset
    const asset = direction === 'from' ? query?.fromAsset : query?.toAsset
    const lockedCurrency = lockAsset
        ? availableAssetGroups?.find(a => a.symbol.toUpperCase() === (asset)?.toUpperCase())
        : undefined

    const apiClient = new LayerSwapApiClient()
    const include_unmatched = 'true'

    const sourceRouteParams = new URLSearchParams({
        include_unmatched,
        ...(toExchange && currencyGroup && currencyGroup ?
            {
                destination_token_group: currencyGroup?.symbol
            }
            : {
                ...(to && toCurrency &&
                {
                    destination_network: to.name,
                    destination_token: toCurrency?.symbol
                })
            })
    });

    const destinationRouteParams = new URLSearchParams({
        include_unmatched,
        ...(fromExchange && currencyGroup && currencyGroup ?
            {
                source_asset_group: currencyGroup?.symbol
            }
            : {
                ...(from && fromCurrency &&
                {
                    source_network: from.name,
                    source_token: fromCurrency?.symbol
                })
            })
    });

    const sourceRoutesURL = `/sources?${sourceRouteParams}`
    const destinationRoutesURL = `/destinations?${destinationRouteParams}`

    const {
        data: sourceRoutes,
        isLoading: sourceRoutesLoading,
    } = useSWR<ApiResponse<CryptoNetwork[]>>(`${sourceRoutesURL}`, apiClient.fetcher, { keepPreviousData: true })

    const {
        data: destinationRoutes,
        isLoading: destRoutesLoading,
    } = useSWR<ApiResponse<CryptoNetwork[]>>(`${destinationRoutesURL}`, apiClient.fetcher, { keepPreviousData: true })

    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : availableAssetGroups

    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies!,
        values,
        direction === "from" ? sourceRoutes?.data : destinationRoutes?.data,
        lockedCurrency,
    )

    const value = currencyMenuItems?.find(x => x.id == currencyGroup?.symbol);

    useEffect(() => {
        if (value) return
        setFieldValue(name, currencyMenuItems?.[0]?.baseObject)
    }, [])

    const handleSelect = useCallback((item: SelectMenuItem<ExchangeToken>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    return <PopoverSelectWrapper
        placeholder="Asset"
        values={currencyMenuItems}
        value={value}
        setValue={handleSelect}
        disabled={!value?.isAvailable?.value}
    />;
}

export function GenerateCurrencyMenuItems(
    currencies: ExchangeToken[],
    values: SwapFormValues,
    routes?: CryptoNetwork[],
    lockedCurrency?: ExchangeToken | undefined
): SelectMenuItem<ExchangeToken>[] {
    const { fromExchange, toExchange } = values
    let currencyIsAvailable = (currency: ExchangeToken) => {
        if (lockedCurrency) {
            return { value: false, disabledReason: CurrencyDisabledReason.LockAssetIsTrue }
        }
        else if ((fromExchange || toExchange) && !routes?.some(r => r?.tokens?.some(t => t?.symbol === currency.symbol))) {
            return { value: true, disabledReason: CurrencyDisabledReason.InvalidRoute }
        }
        else {
            return { value: true, disabledReason: null }
        }
    }

    return currencies?.map(c => {
        const currency = c
        const displayName = lockedCurrency?.symbol ?? currency.symbol;

        const res: SelectMenuItem<ExchangeToken> = {
            baseObject: c,
            id: c.symbol,
            name: displayName || "-",
            order: CurrencySettings.KnownSettings[c.symbol]?.Order ?? 5,
            imgSrc: c.logo,
            isAvailable: currencyIsAvailable(c),
        };
        return res
    }).sort(SortingByAvailability);
}

export enum CurrencyDisabledReason {
    LockAssetIsTrue = '',
    InsufficientLiquidity = 'Temporarily disabled. Please check later.',
    InvalidRoute = 'InvalidRoute'
}

export default CurrencyGroupFormField