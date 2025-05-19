import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import { ResolveCEXCurrencyOrder } from "../../lib/sorting";
import { useQueryState } from "../../context/query";
import { Exchange, ExchangeToken } from "../../Models/Exchange";
import { resolveExchangesURLForSelectedToken } from "../../helpers/routes";
import { ApiResponse } from "../../Models/ApiResponse";
import useSWR from "swr";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import RouteIcon from "./RouteIcon";
import { useSettingsState } from "../../context/settings";

const CurrencyGroupFormField: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const { to, fromCurrency, toCurrency, from, currencyGroup, toExchange, fromExchange } = values
    const { sourceExchanges, destinationExchanges } = useSettingsState();

    const name = 'currencyGroup'
    const query = useQueryState()
    const exchange = direction === 'from' ? fromExchange : toExchange
    const exchangeRoutesURL = resolveExchangesURLForSelectedToken(direction, values)
    const apiClient = new LayerSwapApiClient()
    const {
        data: exchanges,
        isLoading,
        error
    } = useSWR<ApiResponse<Exchange[]>>(`${exchangeRoutesURL}`, apiClient.fetcher, { keepPreviousData: true, fallbackData: { data: direction === 'from' ? sourceExchanges : destinationExchanges }, dedupingInterval: 10000 })

    const shouldFilterExchange = (exchange && currencyGroup)
    const exchangesData = shouldFilterExchange
        ? exchanges
        : { data: direction === 'from' ? sourceExchanges : destinationExchanges }

    const availableAssetGroups = exchangesData?.data?.find(e => e.name === exchange?.name)?.token_groups

    const isLocked = direction === 'from' ? query?.lockFromAsset : query?.lockToAsset
    const asset = direction === 'from' ? query?.fromAsset : query?.toAsset
    const lockedCurrency = isLocked
        ? availableAssetGroups?.find(a => a.symbol.toUpperCase() === (asset)?.toUpperCase())
        : undefined

    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : availableAssetGroups

    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies!,
        direction,
        lockedCurrency
    )

    const value = currencyMenuItems?.find(x => x.id == currencyGroup?.symbol);

    useEffect(() => {
        if (value) return
        if (currencyMenuItems?.[0])
            setFieldValue(name, currencyMenuItems?.[0]?.baseObject)
        return () => { setFieldValue(name, null) }
    }, [])

    useEffect(() => {
        if (!isLoading && exchangesData) {
            (async () => {
                const currency = direction === 'from' ? toCurrency : fromCurrency
                const exchange = direction === 'from' ? fromExchange : toExchange
                const value = exchangesData?.data?.find(r => r.name === exchange?.name)?.token_groups?.find(t => t.symbol === currencyGroup?.symbol)

                if (!value || value === currencyGroup) return
                (value as any).manuallySet = currency?.manuallySet
                await setFieldValue(`${direction == "from" ? "to" : "from"}Currency`, currency, true)
                await setFieldValue(name, value, true)
                await setFieldValue("validatingCurrencyGroup", false, true)
            })();
        }
    }, [fromCurrency, toCurrency, exchangesData, currencyGroup])

    const handleSelect = useCallback(async (item: SelectMenuItem<ExchangeToken>) => {
        const oppositeCurrency = direction === 'from' ? toCurrency : fromCurrency
        if (oppositeCurrency && !oppositeCurrency?.manuallySet && oppositeCurrency.symbol !== item.baseObject.symbol) {
            
            const network = direction === 'to' ? from : to
            const default_currency = network?.tokens?.find(t => t.symbol === item.baseObject.symbol) || network?.tokens?.find(t => t.symbol.includes(item.baseObject.symbol) || item.baseObject.symbol.includes(t.symbol))
            if (default_currency) {
                await setFieldValue("validatingDestination", true, true)
                await setFieldValue("validatingSource", true, true)
                await setFieldValue("validatingCurrencyGroup", true, true)
                await setFieldValue(`${direction == "from" ? "to" : "from"}Currency`, default_currency, true)
            }
        }

        (item.baseObject as any).manuallySet = true
        await setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to, values])

    return <PopoverSelectWrapper
        placeholder="Asset"
        values={currencyMenuItems}
        value={value}
        setValue={handleSelect}
        disabled={isLocked}
    />;
}

export function GenerateCurrencyMenuItems(
    currencies: ExchangeToken[],
    direction: string,
    lockedCurrency?: ExchangeToken | undefined,
): SelectMenuItem<ExchangeToken>[] {

    return currencies?.map(c => {
        const currency = c
        const displayName = lockedCurrency?.symbol ?? currency.symbol;

        const isAvailable = (lockedCurrency || (c?.status !== "active" && c.status !== "not_found")) ? false : true;

        const res: SelectMenuItem<ExchangeToken> = {
            baseObject: c,
            id: c.symbol,
            name: displayName || "-",
            order: ResolveCEXCurrencyOrder(c),
            imgSrc: c.logo,
            isAvailable: isAvailable,
            leftIcon: <RouteIcon direction={direction} isAvailable={isAvailable} routeNotFound={false} type="token" />
        };
        return res
    });
}

export default CurrencyGroupFormField