import KnownInternalNames from "./knownIds";

export default class NetworkSettings {
    ConfirmationWarningMessage?: string;
    UserGuideUrlForDesktop?: string;
    UserGuideUrlForMobile?: string;
    WithdrawalWarningMessage?: string;
    ChainId?: number;
    EstimatedTransferTime?: number;
    AddressPlaceholder?: string;
    Order?: number;

    public static ForceDisable?: { [network: string]: { offramp: boolean, onramp: boolean } }
    public static KnownSettings: { [network: string]: NetworkSettings } = {};

    public static ImmutableXSettings: {
        [network: string]: {
            linkUri: string,
            apiUri: string
        }
    }

    public static RhinoFiSettings: {
        [network: string]: {
            apiUri: string,
            appUri: string
        }
    }

    private static _isInitialized = false;
    public static Initialize() {
        if (NetworkSettings._isInitialized) {
            return;
        }

        NetworkSettings._isInitialized = true;
        NetworkSettings.ForceDisable = JSON.parse(process.env.NEXT_PUBLIC_NETWORK_FORCE_SETTINGS || "{}")

        NetworkSettings.KnownSettings[KnownInternalNames.Networks.LoopringMainnet] = {
            UserGuideUrlForDesktop: "https://docs.layerswap.io/user-docs/using-layerswap/withdrawals/loopring",
            ConfirmationWarningMessage: "If you're using the GameStop wallet, please navigate to Loopring.io and use it to transfer funds instead of the GameStop wallet itself",
            Order: 0,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumRinkeby] = {
            ChainId: 421611,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZksyncMainnet] = {
            ChainId: 25,
            Order: 1,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZkspaceMainnet] = {
            Order: 8,
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
            Order: 6,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumNova] = {
            ChainId: 42170,
            Order: 9,
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
            Order: 5,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.AstarMainnet] = {
            ChainId: 592,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumMainnet] = {
            ChainId: 1,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BobaMainnet] = {
            ChainId: 288,
            Order: 7,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.RoninMainnet] = {
            ChainId: 2020,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.Osmosis] = {
            AddressPlaceholder: 'osmo123...ab56c'
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ImmutableX] = {
            Order: 2,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BNBChainMainnet] = {
            Order: 3,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.StarkNetMainnet] = {
            Order: 4,
        };

        NetworkSettings.ImmutableXSettings = {
            [KnownInternalNames.Networks.ImmutableX]: {
                apiUri: "https://api.x.immutable.com/v1",
                linkUri: "https://link.x.immutable.com",
            },
            [KnownInternalNames.Networks.ImmutableXGoerli]: {
                apiUri: "https://api.sandbox.x.immutable.com/v1",
                linkUri: "https://link.sandbox.x.immutable.com"
            }
        }
        NetworkSettings.RhinoFiSettings = {
            [KnownInternalNames.Networks.RhinoFiMainnet]: {
                apiUri: "https://api.deversifi.com/v1/trading/registrations/",
                appUri: "https://app.rhinofi.com/",
            }
        }
    }
}

NetworkSettings.Initialize();
