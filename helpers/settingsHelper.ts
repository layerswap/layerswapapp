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

export function getPartner(query: QueryParams, settings: LayerSwapSettings): { partner: Partner, displayPartner: boolean, partnerImage: string } | undefined {
    if (!query.addressSource || !settings?.partners) return undefined
    const { discovery: { resource_storage_url } } = settings
    const partner = settings.partners?.find(p => p.internal_name?.toLowerCase() === query.addressSource?.toLowerCase())
    if (!partner) return undefined
    return {
        partner,
        displayPartner: !!query.destAddress && partner?.is_wallet,
        partnerImage: partner?.internal_name ? `${resource_storage_url}/layerswap/partners/${partner?.internal_name}.png` : null
    }
}