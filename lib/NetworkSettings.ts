import KnownInternalNames from "./knownIds";


type NetworkItemSettings = {
    [network: string]: {
        apiUri: string,
        appUri?: string,
        linkUri?: string
    }
}
export default class NetworkSettings {
    ConfirmationWarningMessage?: string;
    UserGuideUrlForDesktop?: string;
    UserGuideUrlForMobile?: string;
    WithdrawalWarningMessage?: string;
    ChainId?: number;
    EstimatedTransferTime?: number;
    AddressPlaceholder?: string;
    Order?: number;
    AccountExplorerTemplate?: string;
    Refuel?: boolean = false

    public static ForceDisable?: { [network: string]: { offramp: boolean, onramp: boolean, crossChain: boolean } }
    public static KnownSettings: { [network: string]: NetworkSettings } = {};

    public static ImmutableXSettings: NetworkItemSettings

    public static RhinoFiSettings: NetworkItemSettings

    public static DydxSettings: NetworkItemSettings

    private static _isInitialized = false;
    public static Initialize() {
        if (NetworkSettings._isInitialized) {
            return;
        }

        NetworkSettings._isInitialized = true;
        NetworkSettings.ForceDisable = JSON.parse(process.env.NEXT_PUBLIC_NETWORK_FORCE_SETTINGS || "{}")

        NetworkSettings.KnownSettings[KnownInternalNames.Networks.LoopringMainnet] = {
            UserGuideUrlForDesktop: "https://docs.layerswap.io/user-docs/using-layerswap/withdrawals/loopring",
            ConfirmationWarningMessage: "You can now transfer funds directly from the GameStop wallet.",
            Order: 50,
            AccountExplorerTemplate: 'https://explorer.loopring.io/account/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumRinkeby] = {
            ChainId: 421611,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZksyncMainnet] = {
            ChainId: 25,
            Order: 20,
            AccountExplorerTemplate: 'https://zkscan.io/explorer/accounts/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZksyncEraMainnet] = {
            Order: 25,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ZkspaceMainnet] = {
            Order: 120,
            AccountExplorerTemplate: 'https://zkspace.info/account/{0}'
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumGoerli] = {
            ChainId: 5,
            AccountExplorerTemplate: 'https://goerli.etherscan.io/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.MoonbeamMainnet] = {
            ChainId: 1284,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.PolygonMainnet] = {
            ChainId: 137,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumMainnet] = {
            ChainId: 42161,
            Order: 60,
            AccountExplorerTemplate: 'https://arbiscan.io/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumNova] = {
            ChainId: 42170,
            Order: 100,
            AccountExplorerTemplate: 'https://nova.arbiscan.io/address/{0}'
            ,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumGoerly] = {
            ChainId: 421613,
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
            Order: 80,
            AccountExplorerTemplate: 'https://optimistic.etherscan.io/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.AstarMainnet] = {
            ChainId: 592,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumMainnet] = {
            Order: 30,
            ChainId: 1,
            AccountExplorerTemplate: 'https://etherscan.io/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BobaMainnet] = {
            ChainId: 288,
            Order: 80,
            AccountExplorerTemplate: 'https://blockexplorer.boba.network/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.RoninMainnet] = {
            ChainId: 2020,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.Osmosis] = {
            AddressPlaceholder: 'osmo123...ab56c',
            Order: 110,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ImmutableX] = {
            Order: 70,
            AccountExplorerTemplate: 'https://immutascan.io/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ImmutableXGoerli] = {
            AccountExplorerTemplate: 'https://immutascan.io/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BNBChainMainnet] = {
            Order: 90,
            AccountExplorerTemplate: 'https://bscscan.com/address/{0}',
            Refuel: true
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.StarkNetMainnet] = {
            Order: 10,
            AccountExplorerTemplate: 'https://starkscan.co/contract/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.StarkNetGoerli] = {
            AccountExplorerTemplate: 'https://goerli.voyager.online/contract/{0}'
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.Cronos] = {
            AccountExplorerTemplate: 'https://cronoscan.com/address/{0}'
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.RhinoFiMainnet] = {
            AccountExplorerTemplate: 'https://app.rhino.fi/account/{0}',
            Order: 130
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.SolanaMainnet] = {
            AddressPlaceholder: 'A1b2...69Ckfg'
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.SolanaTestnet] = {
            AddressPlaceholder: 'A1b2...69Ckfg'
        },
            NetworkSettings.KnownSettings[KnownInternalNames.Networks.DydxMainnet] = {
                Order: 40,
            }


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
                apiUri: "https://api.rhino.fi/v1/trading/registrations",
                appUri: "https://app.rhinofi.com/",
            }
        }

        NetworkSettings.DydxSettings = {
            [KnownInternalNames.Networks.DydxMainnet]: {
                apiUri: "https://api.dydx.exchange/v3/users/exists?ethereumAddress=",
                appUri: "https://trade.dydx.exchange/",
            },
            [KnownInternalNames.Networks.DydxGoerli]: {
                apiUri: "https://api.stage.dydx.exchange/v3/users/exists?ethereumAddress=",
                appUri: "https://trade.stage.dydx.exchange/",
            }
        }
    }
}

NetworkSettings.Initialize();
