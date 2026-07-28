import KnownInternalNames from "./knownIds";

export default class CurrencySettings {
    Order?: number;

    public static KnownSettings: { [network: string]: CurrencySettings } = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (CurrencySettings._isInitialized) {
            return;
        }

        CurrencySettings._isInitialized = true;

        CurrencySettings.KnownSettings[KnownInternalNames.Currencies.ETH] = {
            Order: 0,
        };
        CurrencySettings.KnownSettings[KnownInternalNames.Currencies.USDCe] = {
            Order: 1,
        };
        CurrencySettings.KnownSettings[KnownInternalNames.Currencies.USDCE] = {
            Order: 1,
        };
        CurrencySettings.KnownSettings[KnownInternalNames.Currencies.USDC] = {
            Order: 2,
        };
        CurrencySettings.KnownSettings[KnownInternalNames.Currencies.USDT] = {
            Order: 3,
        };
        CurrencySettings.KnownSettings[KnownInternalNames.Currencies.LRC] = {
            Order: 4,
        };
    }
}

CurrencySettings.Initialize();