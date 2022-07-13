import KnownIds from "./knownIds";

export default class ExchangeSettings {
    ExchangeWithdrawalPageUrl?: string;
    ExchangeApiKeyPageUrl?: string;
    UserApiKeyGuideUrl?: string;
    UserWithdrawalGuideUrl?: string;
    RequireSelectInternal?: boolean = false;
    AuthorizationNote?: string;
    WithdrawalWarningMessage?: string;

    public static KnownSettings: { [key: string]: ExchangeSettings } = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (ExchangeSettings._isInitialized) {
            return;
        }

        ExchangeSettings._isInitialized = true;

        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BinanceId] = {
            ExchangeApiKeyPageUrl: "https://www.binance.com/en/my/settings/api-management",
            ExchangeWithdrawalPageUrl: "https://www.binance.com/en/my/wallet/account/main/withdrawal/crypto",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BitfinexId] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/c8cf508a2c5a4780a9225ac87668d349?iframe",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BittrexId] = {
            ExchangeApiKeyPageUrl: "https://global.bittrex.com/Manage?view=api",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BlocktaneId] = {
            ExchangeApiKeyPageUrl: "https://trade.blocktane.io/account/security/api-keys",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.CoinbaseId] = {
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.CryptoComId] = {
            ExchangeApiKeyPageUrl: "https://crypto.com/exchange/user/settings/api-management",
            WithdrawalWarningMessage: "Only use Crypto.com 'Exchange' to do the transfer. Transfers done from the Crypto.com *App* will not be credited."
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.FtxComId] = {
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
            AuthorizationNote: "Make sure that the 'Query Ledger Entries' key permission is checked.",
            ExchangeWithdrawalPageUrl: "https://www.kraken.com/u/funding/withdraw",
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/6e1326b93076475ebe183d9f615a44c0?iframe",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.KucoinId] = {
            ExchangeWithdrawalPageUrl: "https://www.kucoin.com/assets/withdraw",
            WithdrawalWarningMessage: "Transfers from *KuCoin Android* app are temporarily not supported. Please use the website/iOS app instead.",
            RequireSelectInternal: true,
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.OkexId] = {
            RequireSelectInternal: true,
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/19ac54e0-ccc3-4a4b-b8a9-996a28fb3aa2?iframe",
        };
    }
}

ExchangeSettings.Initialize();