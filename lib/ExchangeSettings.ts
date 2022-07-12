import { tr } from "@markdoc/markdoc/dist/src/schema";
import KnownIds from "./knownIds";

export default class ExchangeSettings {
    ExchangeWithdrawalPageUrl?: string;
    ExchangeApiKeyPageUrl?: string;
    UserApiKeyGuideUrl?: string;
    UserWithdrawalGuideUrl?: string;
    RequireSelectInternal?: boolean = false;
    AuthorizationNote?: string;
    WithdrawalWarningMessage? : string;

    public static KnownSettings: {[key: string]: ExchangeSettings} = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (ExchangeSettings._isInitialized)
        {
            return;
        }

        ExchangeSettings._isInitialized = true;
        
        ExchangeSettings.KnownSettings[KnownIds.Exchanges.BinanceId] = {};
    }
}

ExchangeSettings.Initialize();