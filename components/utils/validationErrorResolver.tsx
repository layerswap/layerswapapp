import { ApiError, LSAPIKnownErrorCode } from "../../Models/ApiError";
import { QueryParams } from "../../Models/QueryParams";
import { SwapFormValues } from "../DTOs/SwapFormValues";

export default function validationMessageResolver(
    values: SwapFormValues,
    direction: string,
    query?: QueryParams,
    error?: ApiError,
): string {
    const { to, from, fromCurrency, toCurrency, toExchange, fromExchange } = values;
    const lockAsset = direction === 'from' ? query?.lockFromAsset : query?.lockToAsset;
    const lockNetwork = direction === 'from' ? query?.lockFrom : query?.lockTo;

    const fromDisplayName = from ? from.display_name : fromExchange?.display_name;
    const toDisplayName = to ? to.display_name : toExchange?.display_name;

    if (lockAsset) {
        return direction === 'from'
            ? `Transfers from ${fromDisplayName} ${fromCurrency?.symbol} to this token are not supported`
            : `Transfers to ${toDisplayName} ${toCurrency?.symbol} from this token are not supported`;
    }

    const fromCurrencyInactive = fromCurrency?.status !== "active";
    const toCurrencyInactive = toCurrency?.status !== "active";
    const routeNotFoundError = error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR;

    if (fromCurrencyInactive || toCurrencyInactive || routeNotFoundError) {
        return `Please change one of the selected tokens`;
    }

    if (lockNetwork) {
        return `No routes available between ${direction === 'from' ? fromDisplayName : toDisplayName} and this token`;
    }

    return '';
}