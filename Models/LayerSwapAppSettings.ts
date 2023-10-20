import { CryptoNetwork, NetworkCurrency } from "./CryptoNetwork";
import { Currency } from "./Currency";
import { Exchange, ExchangeCurrency } from "./Exchange";
import { BaseL2Asset, ExchangeAsset, Layer, NetworkAsset } from "./Layer";
import { LayerSwapSettings } from "./LayerSwapSettings";
import { Partner } from "./Partner";

export class LayerSwapAppSettings extends LayerSwapSettings {
    constructor(settings: LayerSwapSettings | any) {
        super();
        Object.assign(this, LayerSwapAppSettings.ResolveSettings(settings))

        this.layers = LayerSwapAppSettings.ResolveLayers(this.exchanges, this.networks);
    }

    layers: Layer[]

    resolveImgSrc = (item: Layer | Currency | Pick<Layer, 'internal_name'> | { asset: string } | Partner) => {

        if (!item) {
            return "/images/logo_placeholder.png";
        }

        const basePath = new URL(this.discovery.resource_storage_url);

        // Shitty way to check for partner
        if ((item as Partner).is_wallet != undefined) {
            return (item as Partner)?.logo_url;
        }
        else if ((item as any)?.internal_name != undefined) {
            basePath.pathname = `/layerswap/networks/${(item as any)?.internal_name?.toLowerCase()}.png`;
        }
        else if ((item as any)?.asset != undefined) {
            basePath.pathname = `/layerswap/currencies/${(item as any)?.asset?.toLowerCase()}.png`;
        }

        return basePath.href;
    }

    static ResolveSettings(settings: LayerSwapSettings) {
        const basePath = new URL(settings.discovery.resource_storage_url);

        settings.networks = settings.networks.map(n => ({
            ...n,
            img_url: `${basePath}layerswap/networks/${n?.internal_name?.toLowerCase()}.png`
        }))
        settings.exchanges = settings.exchanges.map(e => ({
            ...e,
            img_url: `${basePath}layerswap/networks/${e?.internal_name?.toLowerCase()}.png`
        }))
        settings.currencies = settings.currencies.map(c => ({
            ...c,
            img_url: `${basePath}layerswap/networks/${c?.asset?.toLowerCase()}.png`
        }))

        return settings
    }

    static ResolveLayers(exchanges: Exchange[], networks: CryptoNetwork[]): Layer[] {
        const exchangeLayers: Layer[] = exchanges.map((e): Layer => ({
            isExchange: true,
            assets: LayerSwapAppSettings.ResolveExchangeL2Assets(e.currencies, networks),
            ...e
        }))
        const networkLayers: Layer[] = networks.map((n): Layer =>
        ({
            isExchange: false,
            assets: LayerSwapAppSettings.ResolveNetworkL2Assets(n),
            ...n
        }))
        const result = exchangeLayers.concat(networkLayers)
        return result
    }

    static ResolveExchangeL2Assets(
        currencies: ExchangeCurrency[],
        networks: CryptoNetwork[]): ExchangeAsset[] {
        return currencies.map(exchangecurrency => {
            const network = networks.find(n => n.internal_name === exchangecurrency.network) as CryptoNetwork
            const networkCurrencies = network?.currencies.find(nc => nc.asset === exchangecurrency.asset) as NetworkCurrency
            const res: ExchangeAsset = {
                asset: exchangecurrency.asset,
                status: exchangecurrency.status,
                is_default: exchangecurrency.is_default,
                network_internal_name: exchangecurrency.network,
                network: { ...network, currencies: [networkCurrencies] },
                min_deposit_amount: exchangecurrency.min_deposit_amount,
                withdrawal_fee: exchangecurrency.withdrawal_fee,
            }
            return res
        })
    }

    static ResolveNetworkL2Assets(network: CryptoNetwork): NetworkAsset[] {
        return network?.currencies.map(c => ({
            asset: c.asset,
            status: c.status,
            is_default: true,
            network_internal_name: network?.internal_name,
            network: { ...network },
            contract_address: c.contract_address,
            decimals: c.decimals
        }))
    }
}