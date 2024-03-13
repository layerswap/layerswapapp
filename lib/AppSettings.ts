export default class AppSettings {
    static LayerswapBridgeApiUri?: string = process.env.NEXT_PUBLIC_LS_BRIDGE_API;
    static LayerswapApiUri?: string = process.env.NEXT_PUBLIC_LS_API
    static ApiVersion: string = process.env.NEXT_PUBLIC_API_VERSION || 'mainnet';
    static ExplorerURl: string = `https://www.layerswap.io/${process.env.NEXT_PUBLIC_API_VERSION === 'sandbox' ? 'testnet/' : ''}explorer`
}

