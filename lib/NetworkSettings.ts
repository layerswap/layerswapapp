import KnownIds from "./knownIds";

export default class NetworkSettings {
    ConfirmationWarningMessage?: string;
    UserGuideUrlForDesktop?: string;
    UserGuideUrlForMobile?: string;
    WithdrawalWarningMessage?: string;

    public static KnownSettings: { [key: string]: NetworkSettings } = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (NetworkSettings._isInitialized) {
            return;
        }

        NetworkSettings._isInitialized = true;

        NetworkSettings.KnownSettings[KnownIds.Networks.LoopringMainnetId] = {
            ConfirmationWarningMessage: "If you're using GameStop, please navigate to Loopring.io and use it to transfer funds instead of GS wallet itself",
            UserGuideUrlForDesktop: "https://app.tango.us/app/embed/afa9943c138143c583ca791a243772f7?iframe",
            UserGuideUrlForMobile: "https://app.tango.us/app/embed/500f28ced0254f6dab4256d669999134?iframe"
        };

    }
}

NetworkSettings.Initialize();