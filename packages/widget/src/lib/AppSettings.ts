import { ThemeData } from "../Models/Theme"

export default class AppSettings {
    static ApiVersion: string = "mainnet"
    static ExplorerURl: string = `https://www.layerswap.io/explorer/`
    static LayerswapApiUri?: string = 'https://api.layerswap.io'
    static ResourseStorageUrl: string = 'https://prodlslayerswapbridgesa.blob.core.windows.net/'
    static TelegramLogConfigs = {
        feedback_token: '',
        feedback_chat_id: '',
        error_token: '',
        error_chat_id: ''
    }
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
        manifestUrl: string
    } = {
            tonApiKey: '815b3d3036592d941bbcec5a4db824a588c1b2d210c3a4b6d188dcd4a15337d2',
            manifestUrl: `https://layerswap.io/app/tonconnect-manifest.json`
        }
    static ImtblPassportConfig: {
        publishableKey: string,
        clientId: string,
        redirectUri: string,
        logoutRedirectUri: string
    } | undefined = {
            publishableKey: "",
            clientId: "",
            redirectUri: "",
            logoutRedirectUri: ""
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