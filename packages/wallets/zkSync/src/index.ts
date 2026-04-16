"use client";

import React from "react";
import { WalletProviderModule, LazyBalanceProvider, LazyGasProvider } from "@layerswap/widget/types";
import { KnownInternalNames } from "@layerswap/widget/internal";

export function createZkSyncModule(): WalletProviderModule {
    return {
        id: "evm",
        gasProvider: new LazyGasProvider(
            (n) => KnownInternalNames.Networks.ZksyncMainnet.includes(n.name),
            () => import("./zkSyncGasProvider").then(m => new m.ZkSyncGasProvider())
        ),
        balanceProvider: new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.ZksyncMainnet.includes(n.name),
            () => import("./zkSyncBalanceProvider").then(m => new m.ZkSyncBalanceProvider())
        ),
        multiStepHandler: {
            component: React.lazy(() => import("./ZkSyncMultiStepHandler")),
            supportedNetworks: [KnownInternalNames.Networks.ZksyncMainnet]
        }
    }
}