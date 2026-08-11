import { KnownInternalNames } from "@layerswap/utils";

export default class NetworkSettings {
    BaseFeeMultiplier?: number;
    MinPriorityFeePerGasInGwei?: number;
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

        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZksyncEraMainnet] = {
            BaseFeeMultiplier: 1.7
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.PolygonMainnet] = {
            BaseFeeMultiplier: 1.01
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumMainnet] = {
            BaseFeeMultiplier: 4.15
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumNova] = {
            BaseFeeMultiplier: 1.7
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.OptimismMainnet] = {
            BaseFeeMultiplier: 1.5,
            MinPriorityFeePerGasInGwei: 0.0001,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ScrollMainnet] = {
            BaseFeeMultiplier: 1.5,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZircuitMainnet] = {
            BaseFeeMultiplier: 1.5,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumMainnet] = {
            BaseFeeMultiplier: 1.7
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.AbstractMainnet] = {
            BaseFeeMultiplier: 1.9
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumSepolia] = {
            ChainOrder: 1
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BNBChainMainnet] = {
            BaseFeeMultiplier: 1.2,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.LineaMainnet] = {
            BaseFeeMultiplier: 1.7,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BaseMainnet] = {
            BaseFeeMultiplier: 1.7,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.MantaMainnet] = {
            BaseFeeMultiplier: 1.7,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.RolluxMainnet] = {
            BaseFeeMultiplier: 1.7,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.OpBNBMainnet] = {
            BaseFeeMultiplier: 1.7,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.PGNMainnet] = {
            BaseFeeMultiplier: 2.1,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.AvalancheMainnet] = {
            BaseFeeMultiplier: 1.7,
            MinPriorityFeePerGasInGwei: 1.5,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZoraMainnet] = {
            BaseFeeMultiplier: 1.7,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.RedStoneMainnet] = {
            BaseFeeMultiplier: 1.7,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.TempoTestnet] = {
            FeeParsingDecimalPlaces: 18,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.TempoMainnet] = {
            FeeParsingDecimalPlaces: 18,
        };
    }
}
