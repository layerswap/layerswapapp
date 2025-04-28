export default class AppSettings {
    static ApiVersion?: string = "mainnet"
    static Integrator: string = 'Layerswap'
    static apikey: string = this.ApiVersion === 'testnet' ? 'sandbox' : 'NDBxG+aon6WlbgIA2LfwmcbLU52qUL9qTnztTuTRPNSohf/VnxXpRaJlA5uLSQVqP8YGIiy/0mz+mMeZhLY4/Q'
    static ExplorerURl: string = `https://www.layerswap.io/explorer/`
    static LayerswapApiUri?: string = this.ApiVersion === 'testnet' ? 'https://api-dev.layerswap.cloud' : 'https://api.layerswap.io'
    static IdentitiyApiUri?: string = this.ApiVersion === 'testnet' ? 'https://identity-api-dev.layerswap.cloud' : 'https://identity-api.layerswap.io'
    static ResourseStorageUrl: string = this.ApiVersion === 'testnet' ? 'ttps://devlslayerswapbridgesa.blob.core.windows.net/' : 'https://prodlslayerswapbridgesa.blob.core.windows.net/'
    static WalletConnectConfig: {
        projectId: string
        name: string
        description: string
        url: string
        icons: string[]
    } = {
            projectId: '28168903b2d30c75e5f7f2d71902581b',
            name: 'Layerswap',
            description: 'Layerswap App',
            url: 'https://layerswap.io/app/',
            icons: ['https://www.layerswap.io/app/symbol.png'],
        }
    static TonClientConfig: {
        TonApiKey: string
    } = {
            TonApiKey: 'ac793ea74c19105d617dfbeedb827f1b267b4e91f1b15b2420d003ec49722c82',
        }
    static DisableExchanges: boolean = false
    static FeaturedNetwork?: {
        initialDirection: 'from' | 'to',
        network: string,
        oppositeDirectionOverrides?: 'onlyNetworks' | 'onlyExchanges' | string[]
    }
}