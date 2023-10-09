export default class AppSettings {
    static LayerswapApiUri?: string = process.env.NEXT_PUBLIC_LS_BRIDGE_API;
    static ExplorerURl: string = `https://www.layerswap.io/${process.env.NEXT_PUBLIC_API_VERSION === 'sandbox' ? 'testnet/' : ''}explorer`
}

