import axios from "axios";
import { Network } from "@/Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import { GasProps } from "@/Models/Balance";
import { GasProvider } from "@/types";
import { LoopringAPI } from "./services/transferService/loopring/LoopringAPI";
import { LOOPRING_URLs, LpFee } from "./services/transferService/loopring/defs";

export class LoopringGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.LoopringMainnet.includes(network.name) || KnownInternalNames.Networks.LoopringGoerli.includes(network.name))
    }

    getGas = async ({ address, token }: GasProps) => {
        try {
            const account: { data: AccountInfo } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.ACCOUNT_ACTION}?owner=${address}`)
            const accInfo = account.data
            const result: { data: LpFee } = await axios.get(`${LoopringAPI.BaseApi}${LOOPRING_URLs.GET_OFFCHAIN_FEE_AMT}?accountId=${accInfo.accountId}&requestType=3`)
            const formatedGas = formatAmount(result.data.fees.find(f => f?.token === token.symbol)?.fee, Number(token.decimals));
            if (formatedGas) return { gas: formatedGas, token: token }
        }
        catch (e) {
            console.log(e)
        }
    }
}

interface AccountInfo {
    accountId: number;
}