
export default class NetworkSettings {
    ChainOrder?: number
    FeeParsingDecimalPlaces?: number

    private static _knownSettings: { [chainId: number]: NetworkSettings } | undefined;

    public static get KnownSettings(): { [chainId: number]: NetworkSettings } {
        if (!NetworkSettings._knownSettings) {
            NetworkSettings._knownSettings = {};
            NetworkSettings.Initialize();
        }
        return NetworkSettings._knownSettings;
    }

    private static _isInitialized = false;
    public static Initialize() {
        if (NetworkSettings._isInitialized) {
            return;
        }

        NetworkSettings._isInitialized = true;

        NetworkSettings.KnownSettings[11155111] = {
            ChainOrder: 1
        };
        NetworkSettings.KnownSettings[42431] = {
            FeeParsingDecimalPlaces: 18,
        };
        NetworkSettings.KnownSettings[4217] = {
            FeeParsingDecimalPlaces: 18,
        };
    }
}
