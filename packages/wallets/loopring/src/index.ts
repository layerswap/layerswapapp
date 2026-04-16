"use client";

import React from "react";
import { KnownInternalNames } from "@layerswap/widget/internal";
import { WalletProviderModule, LazyBalanceProvider, LazyGasProvider } from "@layerswap/widget/types";

const isLoopringNetwork = (name: string) =>
    KnownInternalNames.Networks.LoopringMainnet.includes(name) ||
    KnownInternalNames.Networks.LoopringGoerli.includes(name) ||
    KnownInternalNames.Networks.LoopringSepolia.includes(name);

export function createLoopringModule(): WalletProviderModule {
    return {
        id: "evm",
        gasProvider: new LazyGasProvider(
            (n) => isLoopringNetwork(n.name),
            () => import("./loopringGasProvider").then(m => new m.LoopringGasProvider())
        ),
        balanceProvider: new LazyBalanceProvider(
            (n) => isLoopringNetwork(n.name),
            () => import("./loopringBalanceProvider").then(m => new m.LoopringBalanceProvider())
        ),
        multiStepHandler: {
            component: React.lazy(() => import("./loopringMultiStepHandler")),
            supportedNetworks: [
                KnownInternalNames.Networks.LoopringMainnet,
                KnownInternalNames.Networks.LoopringGoerli,
                KnownInternalNames.Networks.LoopringSepolia
            ]
        }
    }
}