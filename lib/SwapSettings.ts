import KnownInternalNames from "./knownIds";

export default class SwapSettings {

    public static InformationMessageCase: {
        [from: string]: {
            to: string,
            InformationMessage?: string
        }
    }

    private static _isInitialized = false;
    public static Initialize() {
        if (SwapSettings._isInitialized) {
            return;
        }

        SwapSettings._isInitialized = true;

        SwapSettings.InformationMessageCase = {
            [KnownInternalNames.Exchanges.Coinbase]: {
                to: KnownInternalNames.Networks.LoopringMainnet,
                InformationMessage: 'gagulik'
            },
            [KnownInternalNames.Exchanges.Kucoin]: {
                to: KnownInternalNames.Networks.LoopringMainnet,
                InformationMessage: 'glglik'
            },
        }

    }
}

SwapSettings.Initialize();
