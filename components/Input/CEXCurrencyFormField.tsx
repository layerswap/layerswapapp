import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import { ResolveCEXCurrencyOrder, SortAscending } from "../../lib/sorting";
import { useQueryState } from "../../context/query";
import { Exchange, ExchangeToken } from "../../Models/Exchange";
import { resolveExchangesURLForSelectedToken } from "../../helpers/routes";
import { ApiResponse } from "../../Models/ApiResponse";
import useSWR from "swr";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";
import RouteIcon from "../icons/RouteIcon";
import useValidationErrorStore from "../validationError/validationErrorStore";
import validationMessageResolver from "../utils/validationErrorResolver";
import ClickTooltip from "../Tooltips/ClickTooltip";

const CurrencyGroupFormField: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const { to, fromCurrency, toCurrency, from, currencyGroup, toExchange, fromExchange } = values
    const { setValidationMessage, clearValidationMessage, message } = useValidationErrorStore();

    const name = 'currencyGroup'
    const query = useQueryState()
    const exchange = direction === 'from' ? fromExchange : toExchange

    const exchangeRoutesURL = resolveExchangesURLForSelectedToken(direction, values)
    const apiClient = new LayerSwapApiClient()
    const {
        data: exchanges,
        error
    } = useSWR<ApiResponse<Exchange[]>>(`${exchangeRoutesURL}`, apiClient.fetcher, { keepPreviousData: true })

    const availableAssetGroups = exchanges?.data?.find(e => e.name === exchange?.name)?.token_groups
    
    const lockAsset = direction === 'from' ? query?.lockFromAsset : query?.lockToAsset
    const asset = direction === 'from' ? query?.fromAsset : query?.toAsset
    const lockedCurrency = lockAsset
        ? availableAssetGroups?.find(a => a.symbol.toUpperCase() === (asset)?.toUpperCase())
        : undefined

    const filteredCurrencies = lockedCurrency ? [lockedCurrency] : availableAssetGroups

    const currencyMenuItems = GenerateCurrencyMenuItems(
        filteredCurrencies!,
        lockedCurrency,
        direction
    )

    const value = currencyMenuItems?.find(x => x.id == currencyGroup?.symbol);

    useEffect(() => {
        if (currencyGroup?.status === 'not_found') {
            setValidationMessage('Warning', 'Token not found in route.', 'warning', name);
        } else {
            clearValidationMessage()
        }
    }, [currencyGroup, message])

    useEffect(() => {
        if (value || !currencyMenuItems) return
        setFieldValue(name, currencyMenuItems?.[0]?.baseObject)
    }, [])

    const handleSelect = useCallback((item: SelectMenuItem<ExchangeToken>) => {
        setFieldValue(name, item.baseObject, true)
        const message = validationMessageResolver(values, direction, query, error)
        if (!item.isAvailable)
            setValidationMessage('Warning', message, 'warning', name);
        else
            clearValidationMessage()
    }, [name, direction, toCurrency, fromCurrency, from, to])

    return <PopoverSelectWrapper
        placeholder="Asset"
        values={currencyMenuItems}
        value={value}
        setValue={handleSelect}
        disabled={!value?.isAvailable}
    />;
}

export function GenerateCurrencyMenuItems(
    currencies: ExchangeToken[],
    lockedCurrency?: ExchangeToken | undefined,
    direction?: string
): SelectMenuItem<ExchangeToken>[] {

    return currencies?.map(c => {
        const currency = c
        const displayName = lockedCurrency?.symbol ?? currency.symbol;

        const isAvailable = (lockedCurrency || (c?.status !== "active" && c.status !== "not_found")) ? false : true;
        const rightIcon = c.status === 'inactive' ?
            <ClickTooltip side="left" text={`Transfers ${direction} this token are not available at the moment. Please try later.`} /> : <></>

        const leftIcon = c.status === "not_found" ? (
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild >
                    <div className="absolute -left-0 z-50">
                        <RouteIcon className="!w-3 text-primary-text-placeholder hover:text-primary-text" />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-72">
                        Route unavailable
                    </p>
                </TooltipContent>
            </Tooltip>
        ) : undefined;

        const res: SelectMenuItem<ExchangeToken> = {
            baseObject: c,
            id: c.symbol,
            name: displayName || "-",
            order: ResolveCEXCurrencyOrder(c),
            imgSrc: c.logo,
            isAvailable: isAvailable,
            rightIcon,
            leftIcon
        };
        return res
    });
}

export default CurrencyGroupFormField