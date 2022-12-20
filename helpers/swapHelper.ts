import { SwapItem } from "../lib/layerSwapApiClient"
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Currency } from "../Models/Currency";
import { Exchange, ExchangeCurrency } from "../Models/Exchange";

type Args = {
    swap: SwapItem;
    exchanges: Exchange[];
    networks: CryptoNetwork[];
    currencies: Currency[];
    resource_storage_url: string;
}
type Result = {
    exchange: Exchange;
    source: Exchange | CryptoNetwork;
    destination: Exchange | CryptoNetwork;
    source_logo: string;
    destination_logo: string;
    currency_logo: string;
    network_chain_logo: string;
    currency: Currency & ExchangeCurrency
}
export const GetSourceDestinationData = ({ swap, exchanges, networks, currencies, resource_storage_url }: Args): Result => {
    let source = swap?.source_exchange ? exchanges?.find(e => e?.internal_name?.toUpperCase() === swap?.source_exchange?.toUpperCase())
        : networks?.find(e => e?.internal_name?.toUpperCase() === swap?.source_network?.toUpperCase())

    let destination = swap?.destination_exchange ? exchanges?.find(e => e?.internal_name?.toUpperCase() === swap?.destination_exchange?.toUpperCase())
        : networks?.find(e => e?.internal_name?.toUpperCase() === swap?.destination_network?.toUpperCase())


    let source_logo = `${resource_storage_url}/layerswap/networks/${source?.internal_name?.toLocaleLowerCase()}.png`

    let destination_logo = `${resource_storage_url}/layerswap/networks/${destination?.internal_name?.toLocaleLowerCase()}.png`

    const exchange = (swap?.source_exchange ? source : destination) as Exchange

    const exchange_currency = exchange?.currencies?.find(c => c.network?.toUpperCase() === swap?.source_network?.toUpperCase())

    const currency = currencies?.find(c => exchange_currency?.asset === c.asset)
    const currency_logo = `${resource_storage_url}/layerswap/currencies/${currency?.asset?.toLocaleLowerCase()}.png`
    const network_chain_logo = `${resource_storage_url}/layerswap/networks/${exchange_currency?.network?.toLocaleLowerCase()}.png`

    return {
        destination,
        destination_logo,
        exchange,
        source,
        source_logo,
        currency_logo,
        network_chain_logo,
        currency: { ...exchange_currency, ...currency }
    }
}
