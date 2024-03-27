import AppSettings from "../AppSettings";
import { ChainId } from "./defs";
import { activateAccount, getOffchainFeeAmt, transfer, unlockAccount } from "./helpers";


export const LoopringAPI = {
    CHAIN: AppSettings.ApiVersion === "sandbox" ? ChainId.GOERLI : ChainId.MAINNET,
    BaseApi: AppSettings.ApiVersion === "sandbox" ? "https://uat2.loopring.io" : "https://api3.loopring.io",
    userAPI: {
        getOffchainFeeAmt,
        unlockAccount,
        activateAccount,
        transfer
    },
}

