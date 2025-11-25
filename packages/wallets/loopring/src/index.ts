"use client";

import { KnownInternalNames } from "@layerswap/widget/internal";
import { LoopringBalanceProvider } from "./loopringBalanceProvider";
import { LoopringGasProvider } from "./loopringGasProvider";
import LoopringMultiStepHandler from "./loopringMultiStepHandler";
import { WalletProviderModule } from "@layerswap/widget/types";

export function createLoopringModule(): WalletProviderModule {
    return {
        id: "evm", // ID of the provider that this module depends on
        gasProvider: new LoopringGasProvider(),
        balanceProvider: new LoopringBalanceProvider(),
        multiStepHandler: {
            component: LoopringMultiStepHandler,
            supportedNetworks: [
                KnownInternalNames.Networks.LoopringMainnet,
                KnownInternalNames.Networks.LoopringGoerli,
                KnownInternalNames.Networks.LoopringSepolia
            ]
        }
    }
}