import { Network } from "@/Models/Network";
import KnownInternalNames from "../../knownIds";
import { LIGHTER_USDC_SYMBOL } from "../../wallets/lighter/constants";
import { LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC } from "../../wallets/lighter/routes";
import { GasProps } from "../../../Models/Balance";
import { GasProvider, GasWithToken } from "./types";

export class LighterGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.name === KnownInternalNames.Networks.LighterMainnet
            || network.name === KnownInternalNames.Networks.LighterTestnet
    }

    getGas = async ({ token }: GasProps): Promise<GasWithToken | undefined> => {
        if (token?.symbol !== LIGHTER_USDC_SYMBOL) return undefined
        return { gas: LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC, token }
    }
}
