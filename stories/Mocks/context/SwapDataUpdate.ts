import { NextRouter } from "next/router"
import { UpdateSwapInterface } from "../../../context/swap"
import { Quote, SwapResponse } from "@/lib/apiClients/layerSwapApiClient"
import { LayerSwapAppSettings } from "@/Models/LayerSwapAppSettings"

const MockFunctions: UpdateSwapInterface = {
    setSelectedSourceAccount: () => { throw new Error("Not implemented") },
    createSwap: () => { throw new Error("Not implemented") },
    setCodeRequested: () => { throw new Error("Not implemented") },
    mutateSwap: () => { throw new Error("Not implemented") },
    setDepositAddressIsFromAccount: () => { throw new Error("Not implemented") },
    setWithdrawType: () => { },
    setInterval: () => { console.log("set interval called") },
    setSwapId: () => { throw new Error("Not implemented") },
    setSwapPath: function (swapId: string, router: NextRouter): void {
        throw new Error("Function not implemented.")
    },
    removeSwapPath: function (router: NextRouter): void {
        throw new Error("Function not implemented.")
    },
    resolveSwapDataFromQuery: function (settings: LayerSwapAppSettings, selectedSourceAddress: string | undefined, quoteData: Quote, destination_address?: string): SwapResponse | undefined {
        throw new Error("Function not implemented.")
    }
}


export default MockFunctions