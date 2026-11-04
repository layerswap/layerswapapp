import { KnownInternalNames } from "@layerswap/utils";

export default class NetworkSettings {
    ChainOrder?: number
    FeeParsingDecimalPlaces?: number

    private static _knownSettings: { [network: string]: NetworkSettings } | undefined;

    public static get KnownSettings(): { [network: string]: NetworkSettings } {
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

        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumSepolia] = {
            ChainOrder: 1
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.TempoTestnet] = {
            FeeParsingDecimalPlaces: 18,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.TempoMainnet] = {
            FeeParsingDecimalPlaces: 18,
        };
    }
}
