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
    static LayerswapApiKeys: {
        [key: string]: string
    } = {
            'mainnet': 'NDBxG+aon6WlbgIA2LfwmcbLU52qUL9qTnztTuTRPNSohf/VnxXpRaJlA5uLSQVqP8YGIiy/0mz+mMeZhLY4/Q',
            'testnet': 'Dz1jVir9WUD0gBWoGbOmS1oe5K4985SGptaZXjF4z9VVrvO5nC9q55h8TE/3CIESRxWdYVpPnz/H2BogL2eG+A'
        }
    static ThemeData?: ThemeData | null
}