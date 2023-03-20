import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Exchange } from "../Models/Exchange";

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