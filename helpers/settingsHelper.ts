import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { SwapType } from "../lib/layerSwapApiClient";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Exchange } from "../Models/Exchange";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { Partner } from "../Models/Partner";
import { QueryParams } from "../Models/QueryParams";

export function mapNetworkCurrencies(exchanges: Exchange[], networks: CryptoNetwork[]): Exchange[] {
    return exchanges.map(e => {
        const currencies = e.currencies.map(ec => {
            const network = networks.find(n => n.internal_name.toLowerCase() === ec.network?.toLowerCase())
            const networkCurrency = network?.currencies?.find(nc => nc.asset.toLowerCase() === ec.asset.toLowerCase())
            return { ...networkCurrency, ...ec }
        })
        return { ...e, currencies: currencies }
    })
}

export function getPartner(query: QueryParams, settings: LayerSwapSettings): { partner?: Partner, displayPartner: boolean, partnerImage?: string } {
    if (!query.addressSource || !settings?.partners) return { displayPartner: false }
    const { discovery: { resource_storage_url } } = settings
    const partner = settings.partners?.find(p => p.internal_name?.toLowerCase() === query.addressSource?.toLowerCase())
    if (!partner) return { displayPartner: false }
    return {
        partner,
        displayPartner: !!query.destAddress && partner?.is_wallet,
        partnerImage: partner?.internal_name ? `${resource_storage_url}/layerswap/partners/${partner?.internal_name}.png` : null
    }
}

export function getDepositeAddressEndpoint(swapFormData: SwapFormValues) {
    if (!(swapFormData?.swapType === SwapType.OffRamp && swapFormData.currency && swapFormData.to))
        return null;
    return `/exchange_accounts/${swapFormData?.to?.baseObject?.internal_name}/deposit_address/${swapFormData?.currency?.baseObject?.asset}`
}

export const canSwitchSourceAndDestination = (values: SwapFormValues) => {
    const fromCurrency = values?.from?.baseObject.currencies.some(c => c.is_deposit_enabled && c.is_withdrawal_enabled)
    const toCurrency = values?.to?.baseObject.currencies.some(c => c.is_deposit_enabled && c.is_withdrawal_enabled)
    if ((values.from && !values.to && fromCurrency) || (values.to && !values.from && toCurrency)) return false
    else if (values.from && values.to && fromCurrency && toCurrency) return false
    else return true
}