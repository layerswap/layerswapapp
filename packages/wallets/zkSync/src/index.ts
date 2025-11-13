"use client";

import { WalletProviderModule } from "@layerswap/widget/types";
import { ZkSyncGasProvider } from "./zkSyncGasProvider";
import { ZkSyncBalanceProvider } from "./zkSyncBalanceProvider";
import ZkSyncMultiStepHandler from "./ZkSyncMultiStepHandler";
import { KnownInternalNames } from "@layerswap/widget/internal";

export const ZKsyncProvider: WalletProviderModule = {
    id: "evm", // ID of the provider that this module depends on
    gasProvider: new ZkSyncGasProvider(),
    balanceProvider: new ZkSyncBalanceProvider(),
    multiStepHandler: {
        component: ZkSyncMultiStepHandler,
        supportedNetworks: [KnownInternalNames.Networks.ZksyncMainnet]
    }
}