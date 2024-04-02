import { useSettingsState } from "../../../../context/settings"
import { useSwapDataState } from "../../../../context/swap"
import NetworkGas from "./WalletTransfer/networkGas"
import { WalletTransferContent } from "./WalletTransferContent"

const WalletTransferWrapper = () => {
    const { swapResponse } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { networks: layers } = useSettingsState()

    const source_layer = layers.find(n => n.name === swap?.source_network?.name)
    const sourceAsset = source_layer?.tokens?.find(c => c.symbol.toLowerCase() === swap?.source_token.symbol.toLowerCase())

    return <div className='border-secondary-500 rounded-md border bg-secondary-700 p-3'>
        {source_layer && sourceAsset && <NetworkGas network={source_layer} selected_currency={sourceAsset} />}
        <WalletTransferContent />
    </div>
}

export default WalletTransferWrapper
