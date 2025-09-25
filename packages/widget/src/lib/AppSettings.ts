import { ThemeData } from "../Models/Theme"

export default class AppSettings {
    static ApiVersion?: string = "mainnet"
    static Integrator: string = 'Layerswap'
    static ExplorerURl: string = `https://www.layerswap.io/explorer/`
    static LayerswapApiUri?: string = 'https://api.layerswap.io'
    static IdentitiyApiUri?: string = 'https://identity-api.layerswap.io'
    static ResourseStorageUrl: string = 'https://prodlslayerswapbridgesa.blob.core.windows.net/'
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
        tonApiKey: string
    } = {
            tonApiKey: 'ac793ea74c19105d617dfbeedb827f1b267b4e91f1b15b2420d003ec49722c82',
        }
    static ImtblPassportConfig: {
        publishableKey: string,
        clientId: string
    } = {
        publishableKey: "",
        clientId: ""
    }
    static DisableExchanges: boolean = false
    static FeaturedNetwork?: {
        initialDirection: 'from' | 'to',
        network: string,
        oppositeDirectionOverrides?: 'onlyNetworks' | 'onlyExchanges' | string[]
    }
    static LayerswapApiKeys: {
        [key: string]: string
    } = {
            'mainnet': 'NDBxG+aon6WlbgIA2LfwmcbLU52qUL9qTnztTuTRPNSohf/VnxXpRaJlA5uLSQVqP8YGIiy/0mz+mMeZhLY4/Q',
            'testnet': 'Dz1jVir9WUD0gBWoGbOmS1oe5K4985SGptaZXjF4z9VVrvO5nC9q55h8TE/3CIESRxWdYVpPnz/H2BogL2eG+A'
        }
    static ThemeData?: ThemeData | null
}