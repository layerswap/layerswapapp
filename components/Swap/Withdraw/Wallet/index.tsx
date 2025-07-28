import { useSwapDataState } from "@/context/swap"
import NetworkGas from "./Common/networkGas"
import { WalletTransferContent } from "./WalletTransferContent"
import { useSelectAccounts } from "@/context/selectedAccounts"
import { SwapBasicData } from "@/lib/apiClients/layerSwapApiClient"
import { FC } from "react"

type Props = {
    swapData: SwapBasicData,
    refuel: boolean,
    swapId: string | undefined
}
const WalletTransferWrapper: FC<Props> = ({ swapData, swapId, refuel }) => {
    const { depositActionsResponse } = useSwapDataState()
    const { selectedSourceAccount } = useSelectAccounts()
    const { source_network } = swapData

    const transfer_action = depositActionsResponse?.find(a => true)
    const { fee_token } = transfer_action || {}

    return <div className='rounded-xl bg-secondary-500 py-3'>
        {
            source_network && fee_token && selectedSourceAccount?.address &&
            <NetworkGas address={selectedSourceAccount.address} network={source_network} token={fee_token} />
        }
        <WalletTransferContent swapData={swapData} swapId={swapId} refuel={refuel} />
    </div>
}

export default WalletTransferWrapper
