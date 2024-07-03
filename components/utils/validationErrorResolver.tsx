import { ApiError, LSAPIKnownErrorCode } from "../../Models/ApiError"
import { Exchange } from "../../Models/Exchange";
import { RouteNetwork } from "../../Models/Network";
import { QueryParams } from "../../Models/QueryParams"
import { SwapFormValues } from "../DTOs/SwapFormValues"
import { LayerDisabledReason } from "../Select/Popover/PopoverSelect"
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";

export default function validationMessageResolver(values: SwapFormValues, direction: string, query?: QueryParams, error?: ApiError, value?: (SelectMenuItem<RouteNetwork | Exchange> & {
    isExchange: boolean;
}) | undefined): string {
    const { to, from, fromCurrency, toCurrency } = values
    const lockAsset = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    let validationMessage = ''

    if (lockAsset) {
        validationMessage = direction === 'from' ? `Transfers from ${from?.display_name} ${fromCurrency?.symbol} to this token are not supported` : `Transfers to ${to?.display_name} ${toCurrency?.symbol} from this token are not supported`
    }
    else if (fromCurrency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) {
        validationMessage = `Can't transfer from ${from?.display_name} ${fromCurrency?.symbol} to ${to?.display_name} ${toCurrency?.symbol}`
    }
    else if (toCurrency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) {
        validationMessage = `Can't transfer to ${to?.display_name} ${toCurrency?.symbol} from ${from?.display_name}`
    }
    else if (value?.isAvailable.disabledReason === LayerDisabledReason.LockNetworkIsTrue) {
        validationMessage = `No routes available between ${direction === 'from' ? from?.display_name : to?.display_name} and this token`
    }
    return validationMessage
}