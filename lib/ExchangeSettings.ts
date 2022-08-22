import KnownIds from "./knownIds";

export default class ExchangeSettings {
    ExchangeWithdrawalPageUrl?: string;
    ExchangeApiKeyPageUrl?: string;
    UserApiKeyGuideUrl?: string;
    UserWithdrawalGuideUrl?: string;
    RequireSelectInternal?: boolean = false;
    AuthorizationNote?: string;
    WithdrawalWarningMessage?: string;
    KeyphraseDisplayName?: string;

    public static KnownSettings: { [key: string]: ExchangeSettings } = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (ExchangeSettings._isInitialized) {
            return;
        }

        ExchangeSettings._isInitialized = true;

        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BinanceId] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/279b954e2d3343038aef5e6a5ad21734?iframe",
            ExchangeApiKeyPageUrl: "https://www.binance.com/en/my/settings/api-management",
            ExchangeWithdrawalPageUrl: "https://www.binance.com/en/my/wallet/account/main/withdrawal/crypto",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BitfinexId] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/c8cf508a2c5a4780a9225ac87668d349?iframe",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BittrexId] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/5564cb40d40446aba1702c3f7b2f5424?iframe",
            ExchangeApiKeyPageUrl: "https://global.bittrex.com/Manage?view=api",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BlocktaneId] = {
            ExchangeApiKeyPageUrl: "https://trade.blocktane.io/account/security/api-keys",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.CoinbaseId] = {
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.CryptoComId] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/d791596ecafb41ed8c0bf98dcaa44f7b?iframe",
            ExchangeApiKeyPageUrl: "https://crypto.com/exchange/user/settings/api-management",
            WithdrawalWarningMessage: "Only use Crypto.com 'Exchange' to do the transfer. Transfers done from the Crypto.com *App* will not be credited."
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.FtxComId] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/7221bd286bf5445fa124994ec02f4d85?iframe",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.FtxUsId] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/7221bd286bf5445fa124994ec02f4d85?iframe",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.HuobiId] = {
            ExchangeApiKeyPageUrl: "https://www.huobi.com/en-us/apikey/",
            ExchangeWithdrawalPageUrl: "https://www.huobi.com/en-us/finance/withdraw",
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/20cb5137d12941328a8b6fbd7bd24d7c?iframe",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.KrakenId] = {
            AuthorizationNote: "When generating the API keys, make sure that the 'Query Ledger Entries' key permission is checked.",
            ExchangeWithdrawalPageUrl: "https://www.kraken.com/u/funding/withdraw",
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/6e1326b93076475ebe183d9f615a44c0?iframe",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.KucoinId] = {
            ExchangeWithdrawalPageUrl: "https://www.kucoin.com/assets/withdraw",
            RequireSelectInternal: true,
            KeyphraseDisplayName: "Keyphrase"
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.OkexId] = {
            WithdrawalWarningMessage: "Please select the 'internal' withdrawal method.",
            RequireSelectInternal: true,
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/19ac54e0-ccc3-4a4b-b8a9-996a28fb3aa2?iframe",
            KeyphraseDisplayName: "Passphrase"
        };
    }
}

ExchangeSettings.Initialize();