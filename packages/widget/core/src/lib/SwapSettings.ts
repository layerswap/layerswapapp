import KnownInternalNames from "./knownIds";

export default class SwapSettings {
    public static NativeSupportedPaths: {
        [exchangeName: string]: {
            [networkName: string]: string[];
        }
    }

    private static _isInitialized = false;
    public static Initialize() {
        if (SwapSettings._isInitialized) {
            return;
        }

        SwapSettings.NativeSupportedPaths = {
            [KnownInternalNames.Exchanges.Binance]: {
                [KnownInternalNames.Networks.BNBChainMainnet]: [KnownInternalNames.Currencies.ETH, KnownInternalNames.Currencies.USDT, KnownInternalNames.Currencies.USDC],
                [KnownInternalNames.Networks.ArbitrumMainnet]: [KnownInternalNames.Currencies.ETH],
                [KnownInternalNames.Networks.OptimismMainnet]: [KnownInternalNames.Currencies.ETH],
            },
            [KnownInternalNames.Exchanges.Kucoin]: {
                [KnownInternalNames.Networks.BNBChainMainnet]: [KnownInternalNames.Currencies.USDT],
                [KnownInternalNames.Networks.OptimismMainnet]: [KnownInternalNames.Currencies.ETH, KnownInternalNames.Currencies.USDC],
                [KnownInternalNames.Networks.ArbitrumMainnet]: [KnownInternalNames.Currencies.ETH, KnownInternalNames.Currencies.USDC],
            },
            [KnownInternalNames.Exchanges.Huobi]: {
                [KnownInternalNames.Networks.BNBChainMainnet]: [KnownInternalNames.Currencies.USDT, KnownInternalNames.Currencies.USDC],
                [KnownInternalNames.Networks.OptimismMainnet]: [KnownInternalNames.Currencies.ETH, KnownInternalNames.Currencies.USDC],
                [KnownInternalNames.Networks.ArbitrumMainnet]: [KnownInternalNames.Currencies.ETH, KnownInternalNames.Currencies.USDC],
            },
            [KnownInternalNames.Exchanges.Okex]: {
                [KnownInternalNames.Networks.BNBChainMainnet]: [KnownInternalNames.Currencies.USDC],
                [KnownInternalNames.Networks.OptimismMainnet]: [KnownInternalNames.Currencies.ETH, KnownInternalNames.Currencies.USDC],
                [KnownInternalNames.Networks.ArbitrumMainnet]: [KnownInternalNames.Currencies.ETH, KnownInternalNames.Currencies.USDC],
            }
        }

        SwapSettings._isInitialized = true;
    }
}

SwapSettings.Initialize();
