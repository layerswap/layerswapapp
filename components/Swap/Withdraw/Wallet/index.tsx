import { FC } from "react"
import { useSettingsState } from "../../../../context/settings"
import { useSwapDataState } from "../../../../context/swap"
import KnownInternalNames from "../../../../lib/knownIds"
import ImtblxWalletWithdrawStep from "./ImtblxWalletWithdrawStep"
import StarknetWalletWithdrawStep from "./StarknetWalletWithdraw"
import TransferFromWallet from "./WalletTransfer"
import ZkSyncWalletWithdrawStep from "./ZKsyncWalletWithdraw"
import SolanaWalletWithdrawStep from "./SolanaWalletWithdraw"
import NetworkGas from "./WalletTransfer/networkGas"

//TODO have separate components for evm and none_evm as others are sweepless anyway
const WalletTransferContent: FC = () => {
    const { swapResponse, swapPrepareData } = useSwapDataState()
    const { swap } = swapResponse || {}
    const { networks: layers } = useSettingsState()

    const { source_network, source_token } = swap || {}
    const source_network_internal_name = source_network?.name
    const source_layer = layers.find(n => n.name === source_network_internal_name)
    const sourceAsset = source_layer?.tokens?.find(c => c.symbol.toLowerCase() === source_token?.symbol.toLowerCase())

    const sourceIsImmutableX = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase() || swap?.source_network === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const sourceIsZkSync = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.ZksyncMainnet?.toUpperCase()
    const sourceIsStarknet = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet?.toUpperCase() || swap?.source_network === KnownInternalNames.Networks.StarkNetGoerli?.toUpperCase()
    const sourceIsLoopring = swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.LoopringMainnet?.toUpperCase() ||
        swap?.source_network?.toUpperCase() === KnownInternalNames.Networks.LoopringGoerli?.toUpperCase()
    const sourceIsSolana = source_network_internal_name?.toUpperCase() === KnownInternalNames.Networks.SolanaMainnet?.toUpperCase()

    const depositAddress = swapPrepareData?.deposit_actions?.find(da => da.type == 'transfer')?.to_address

    const sourceChainId = source_layer ? Number(source_layer?.chain_id) : null
    const requested_amount = swapPrepareData?.deposit_actions.find(da => da.type == 'transfer')?.amount || 0

    if (sourceIsImmutableX)
        return <ImtblxWalletWithdrawStep
            depositAddress={depositAddress}
        />
    else if (sourceIsStarknet)
        return <StarknetWalletWithdrawStep
            amount={requested_amount}
            depositAddress={depositAddress}
        />
    else if (sourceIsZkSync)
        return <>
            {requested_amount
                && <ZkSyncWalletWithdrawStep
                    depositAddress={depositAddress}
                    amount={requested_amount}
                />}
        </>
    else if (sourceIsLoopring)
        return <LoopringWalletWithdraw
            amount={requested_amount}
            depositAddress={depositAddress}
        />
    else if (sourceIsSolana)
        return <>
            {requested_amount &&
                <SolanaWalletWithdrawStep
                    depositAddress={depositAddress}
                    amount={requested_amount}
                />}
        </>
    else
        return <>
            {swap && source_layer && sourceAsset && sourceChainId && <TransferFromWallet
                sequenceNumber={swap?.metadata.sequence_number}
                swapId={swap.id}
                networkDisplayName={source_layer?.display_name}
                tokenDecimals={sourceAsset?.decimals}
                tokenContractAddress={sourceAsset.contract as `0x${string}`}
                chainId={sourceChainId}
                depositAddress={depositAddress}
                userDestinationAddress={swap.destination_address}
                amount={requested_amount}
            />}
        </>
}


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
