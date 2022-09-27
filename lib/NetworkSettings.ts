import KnownIds from "./knownIds";

export default class NetworkSettings {
    ConfirmationWarningMessage?: string;
    UserGuideUrlForDesktop?: string;
    UserGuideUrlForMobile?: string;
    WithdrawalWarningMessage?: string;
    ChainId?: number;

    public static KnownSettings: { [key: string]: NetworkSettings } = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (NetworkSettings._isInitialized) {
            return;
        }

        NetworkSettings._isInitialized = true;

        NetworkSettings.KnownSettings[KnownIds.Networks.LoopringMainnetId] = {
            UserGuideUrlForDesktop: "https://app.tango.us/app/embed/afa9943c138143c583ca791a243772f7?iframe",
            UserGuideUrlForMobile: "https://app.tango.us/app/embed/500f28ced0254f6dab4256d669999134?iframe",
            ConfirmationWarningMessage: "If you're using the GameStop wallet, please navigate to Loopring.io and use it to transfer funds instead of the GameStop wallet itself",
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.ArbitrumRinkebyId] = {
            ChainId: 421611,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.ZksyncMainnetId] = {
            ChainId: 25,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.EthereumGoerliId] = {
            ChainId: 5,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.MoonbeamMainnetId] = {
            ChainId: 1284,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.PolygonMainnetId] = {
            ChainId: 137,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.ArbitrumMainnetId] = {
            ChainId: 42161,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.ArbitrumNovaId] = {
            ChainId: 42170,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.OptimismKovanId] = {
            ChainId: 69,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.EthereumRinkebyId] = {
            ChainId: 4,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.NahmiiMainnetId] = {
            ChainId: 5551,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.BobaRinkebyId] = {
            ChainId: 28,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.OptimismMainnetId] = {
            ChainId: 10,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.AstarMainnetId] = {
            ChainId: 592,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.EthereumMainnetId] = {
            ChainId: 1,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.BobaMainnetId] = {
            ChainId: 288,
        };
        NetworkSettings.KnownSettings[KnownIds.Networks.RoninMainnetId] = {
            ChainId: 2020,
        };
    }
}

NetworkSettings.Initialize();