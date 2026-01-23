import axios from "axios";
import { ErrorHandler, KnownInternalNames, formatUnits } from "@layerswap/widget/internal";
import { GasProvider, GasProps, Network } from "@layerswap/widget/types";
import { LoopringAPI } from "./services/LoopringAPI";
import { LOOPRING_URLs, LpFee } from "./services/defs";

export class LoopringGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.LoopringMainnet.includes(network.name) || KnownInternalNames.Networks.LoopringGoerli.includes(network.name))
    }

    getGas = async ({ address, token }: GasProps) => {
        try {
            const account: { data: AccountInfo } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`)
            const accInfo = account.data
            const result: { data: LpFee } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_OFFCHAIN_FEE_AMT}?accountId=${accInfo.accountId}&requestType=3`)
            const formatedGas = Number(formatUnits(BigInt(result.data.fees.find(f => f?.token === token.symbol)?.fee || 0), Number(token.decimals)));
            if (formatedGas) return { gas: formatedGas, token: token }
        }
        catch (e) {
            const error = e as Error;
            ErrorHandler({
                type: "GasProviderError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
    }
}

interface AccountInfo {
    accountId: number;
}