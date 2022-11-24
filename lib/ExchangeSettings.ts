import KnownInternalNames from "./knownIds";

export default class ExchangeSettings {
    CustomAuthorizationFlow?: "o_auth2" | "api_credentials";
    ExchangeWithdrawalPageUrl?: string;
    ExchangeApiKeyPageUrl?: string;
    UserApiKeyGuideUrl?: string;
    UserWithdrawalGuideUrl?: string;
    RequireSelectInternal?: boolean = false;
    AuthorizationNote?: string;
    WithdrawalWarningMessage?: string;
    KeyphraseDisplayName?: string;
    FeeIsRefundable?: boolean;

    public static KnownSettings: { [key: string]: ExchangeSettings } = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (ExchangeSettings._isInitialized) {
            return;
        }

        ExchangeSettings._isInitialized = true;

        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Binance] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/279b954e2d3343038aef5e6a5ad21734?iframe",
            ExchangeApiKeyPageUrl: "https://www.binance.com/en/my/settings/api-management",
            ExchangeWithdrawalPageUrl: "https://www.binance.com/en/my/wallet/account/main/withdrawal/crypto",
            FeeIsRefundable: true,
            WithdrawalWarningMessage: "Please note that using the PayId method is not supported and won't be detected."
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Bitfinex] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/c8cf508a2c5a4780a9225ac87668d349?iframe",
            ExchangeApiKeyPageUrl: "https://setting.bitfinex.com/api",
            ExchangeWithdrawalPageUrl: "https://movement.bitfinex.com/withdraw",
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Bittrex] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/5564cb40d40446aba1702c3f7b2f5424?iframe",
            ExchangeApiKeyPageUrl: "https://global.bittrex.com/Manage?view=api",
            ExchangeWithdrawalPageUrl: "https://global.bittrex.com/balance",
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Blocktane] = {
            ExchangeApiKeyPageUrl: "https://trade.blocktane.io/account/security/api-keys",
            ExchangeWithdrawalPageUrl: "https://trade.blocktane.io/account/wallets",
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Coinbase] = {
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.CryptoCom] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/d791596ecafb41ed8c0bf98dcaa44f7b?iframe",
            ExchangeApiKeyPageUrl: "https://crypto.com/exchange/user/settings/api-management",
            ExchangeWithdrawalPageUrl: "https://crypto.com/exchange/",
            WithdrawalWarningMessage: "Only use Crypto.com 'Exchange' to do the transfer. Transfers done from the Crypto.com *App* will not be credited."
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.FtxCom] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/7221bd286bf5445fa124994ec02f4d85?iframe",
            ExchangeApiKeyPageUrl: "https://ftx.com/settings/api",
            ExchangeWithdrawalPageUrl: "https://ftx.com/wallet",
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.FtxUs] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/7221bd286bf5445fa124994ec02f4d85?iframe",
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Huobi] = {
            ExchangeApiKeyPageUrl: "https://www.huobi.com/en-us/apikey/",
            ExchangeWithdrawalPageUrl: "https://www.huobi.com/en-us/finance/withdraw",
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/20cb5137d12941328a8b6fbd7bd24d7c?iframe",
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Kraken] = {
            AuthorizationNote: "When generating the API keys, make sure that the 'Query Ledger Entries' key permission is checked.",
            ExchangeWithdrawalPageUrl: "https://www.kraken.com/u/funding/withdraw",
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/6e1326b93076475ebe183d9f615a44c0?iframe",
            ExchangeApiKeyPageUrl: "https://www.kraken.com/u/security/api"
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Kucoin] = {
            ExchangeWithdrawalPageUrl: "https://www.kucoin.com/assets/withdraw",
            ExchangeApiKeyPageUrl: "https://www.kucoin.com/account/api",
            KeyphraseDisplayName: "Keyphrase",
            CustomAuthorizationFlow: "api_credentials"
        };
        ExchangeSettings.KnownSettings[KnownInternalNames.Exchanges.Okex] = {
            UserApiKeyGuideUrl: "https://app.tango.us/app/embed/19ac54e0-ccc3-4a4b-b8a9-996a28fb3aa2?iframe",
            KeyphraseDisplayName: "Passphrase",
            ExchangeApiKeyPageUrl: "https://www.okx.com/account/my-api",
            ExchangeWithdrawalPageUrl: "https://www.okx.com/balance/withdrawal",
        };
    }
}

ExchangeSettings.Initialize();
