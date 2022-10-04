import KnownInternalNames from "./knownIds";

export default class NetworkSettings {
    ConfirmationWarningMessage?: string;
    UserGuideUrlForDesktop?: string;
    UserGuideUrlForMobile?: string;
    WithdrawalWarningMessage?: string;
    ChainId?: number;
    ForceDisable?: boolean;

    public static KnownSettings: { [key: string]: NetworkSettings } = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (NetworkSettings._isInitialized) {
            return;
        }

        NetworkSettings._isInitialized = true;

        NetworkSettings.KnownSettings[KnownInternalNames.Networks.LoopringMainnet] = {
            UserGuideUrlForDesktop: "https://app.tango.us/app/embed/afa9943c138143c583ca791a243772f7?iframe",
            UserGuideUrlForMobile: "https://app.tango.us/app/embed/500f28ced0254f6dab4256d669999134?iframe",
            ConfirmationWarningMessage: "If you're using the GameStop wallet, please navigate to Loopring.io and use it to transfer funds instead of the GameStop wallet itself",
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumRinkeby] = {
            ChainId: 421611,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZksyncMainnet] = {
            ChainId: 25,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.StarkNetGoerli] = {
            ForceDisable: true,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumGoerli] = {
            ChainId: 5,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.MoonbeamMainnet] = {
            ChainId: 1284,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.PolygonMainnet] = {
            ChainId: 137,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumMainnet] = {
            ChainId: 42161,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumNova] = {
            ChainId: 42170,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.OptimismKovan] = {
            ChainId: 69,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumRinkeby] = {
            ChainId: 4,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.NahmiiMainnet] = {
            ChainId: 5551,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BobaRinkeby] = {
            ChainId: 28,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.OptimismMainnet] = {
            ChainId: 10,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.AstarMainnet] = {
            ChainId: 592,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumMainnet] = {
            ChainId: 1,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BobaMainnet] = {
            ChainId: 288,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.RoninMainnet] = {
            ChainId: 2020,
        };
    }
}

NetworkSettings.Initialize();