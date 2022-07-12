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
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.HuobiId] = {
            ExchangeApiKeyPageUrl: "https://www.huobi.com/en-us/apikey/",
            ExchangeWithdrawalPageUrl: "https://www.huobi.com/en-us/finance/withdraw",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.KrakenId] = {
            AuthorizationNote: "Make sure that the 'Query Ledger Entries' key permission is checked.",
            ExchangeWithdrawalPageUrl: "https://www.kraken.com/u/funding/withdraw",
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.KucoinId] = {
            ExchangeWithdrawalPageUrl: "https://www.kucoin.com/assets/withdraw",
            WithdrawalWarningMessage: "Transfers from *KuCoin Android* app are temporarily not supported. Please use the website/iOS app instead.",
            RequireSelectInternal: true,
        };
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.OkexId] = {
            RequireSelectInternal: true,
        };
    }
}

ExchangeSettings.Initialize();