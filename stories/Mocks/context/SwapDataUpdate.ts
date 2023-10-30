import { UpdateInterface } from "../../../context/swap"

const MockFunctions: UpdateInterface = {
    createSwap: () => { throw new Error("Not implemented") },
    setCodeRequested: () => { throw new Error("Not implemented") },
    cancelSwap: () => { throw new Error("Not implemented") },
    setAddressConfirmed: () => { throw new Error("Not implemented") },
    mutateSwap: () => { throw new Error("Not implemented") },
    setWalletAddress: () => { throw new Error("Not implemented") },
    setDepositeAddressIsfromAccount: () => { throw new Error("Not implemented") },
    setWithdrawType: () => { throw new Error("Not implemented") },
    setSwapPublishedTx: () => { throw new Error("Not implemented") },
    setSelectedAssetNetwork: () => { throw new Error("Not implemented") },
    setInterval: () => { console.log("set interval called") },
}


export default MockFunctions