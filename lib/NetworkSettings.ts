import KnownIds from "./knownIds";

export default class NetworkSettings {
    ConfirmationWarningMessage?: string;
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
        };

    }
}

NetworkSettings.Initialize();