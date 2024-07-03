import { ApiError, LSAPIKnownErrorCode } from "../../Models/ApiError"
import { QueryParams } from "../../Models/QueryParams"
import { SwapFormValues } from "../DTOs/SwapFormValues"

export default function validationMessageResolver(values: SwapFormValues, direction: string, query?: QueryParams, error?: ApiError) {
    const { to, from, fromCurrency, toCurrency } = values
    const lockAsset = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    let validationMessage = ''

    if (lockAsset) {
        validationMessage = direction === 'from' ? `Transfers from ${from?.display_name} ${fromCurrency} to this token are not supported` : `Transfers to ${to?.display_name} ${toCurrency} from this token are not supported`
    }
    else if (fromCurrency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) {
        validationMessage = `Can't transfer from ${from?.display_name} ${fromCurrency} to ${to?.display_name} ${toCurrency}`
    }
    else if (toCurrency?.status !== "active" || error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) {
        validationMessage = `Can't transfer to ${to?.display_name} ${toCurrency} from ${from?.display_name}`
    }
    else {
        return { value: true, disabledReason: null }
    }
}