import { NextRouter } from "next/router"
import { UpdateSwapInterface } from "../../../context/swap"

const MockFunctions: UpdateSwapInterface = {
    createSwap: () => { throw new Error("Not implemented") },
    setCodeRequested: () => { throw new Error("Not implemented") },
    mutateSwap: () => { throw new Error("Not implemented") },
    setDepositAddressIsFromAccount: () => { throw new Error("Not implemented") },
    setWithdrawType: () => { },
    setInterval: () => { console.log("set interval called") },
    setSwapId: () => { throw new Error("Not implemented") },
    setSubmitedFormValues: () => { throw new Error("Not implemented") },
    setQuoteLoading: () => { throw new Error("Not implemented") },
}


export default MockFunctions