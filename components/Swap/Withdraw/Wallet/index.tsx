import { FC } from "react"
import { ApiResponse } from "../../../../Models/ApiResponse"
import { useSettingsState } from "../../../../context/settings"
import { useSwapDataState } from "../../../../context/swap"
import KnownInternalNames from "../../../../lib/knownIds"
import LayerSwapApiClient, { DepositAddress, DepositType, Fee } from "../../../../lib/layerSwapApiClient"
import ImtblxWalletWithdrawStep from "./ImtblxWalletWithdrawStep"
import StarknetWalletWithdrawStep from "./StarknetWalletWithdraw"
import useSWR from 'swr'
import { useAccount } from "wagmi"
import TransferFromWallet from "./WalletTransfer"
import { CanDoSweeplessTransfer } from "../../../../lib/fees"
import { useWalletState } from "../../../../context/wallet"

const WalletTransfer: FC = () => {
    const { swap } = useSwapDataState()
    const { starknetAccount, imxAccount } = useWalletState();
    const { address } = useAccount()
    const { destination_address, destination_network_asset, source_network_asset, source_layer, destination_layer } = swap
    const sourceAsset = source_layer.assets.find(c => c.asset.toLowerCase() === swap.source_network_asset.asset.toLowerCase())

    const sourceIsImmutableX = source_layer.internal_name.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase() || source_layer?.internal_name === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
    const sourceIsStarknet = source_layer.internal_name?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet?.toUpperCase() || source_layer?.internal_name === KnownInternalNames.Networks.StarkNetGoerli?.toUpperCase()
    let connectedWalletAddress = sourceIsImmutableX ? imxAccount : sourceIsStarknet ? starknetAccount?.account?.address : address;
    const canDoSweeplessTransfer = CanDoSweeplessTransfer(source_layer, connectedWalletAddress, destination_address)
    const layerswapApiClient = new LayerSwapApiClient()
    const shouldGetGeneratedAddress = !canDoSweeplessTransfer
    const generateDepositParams = shouldGetGeneratedAddress ? [source_layer?.internal_name] : null
    const {
        data: generatedDeposit
    } = useSWR<ApiResponse<DepositAddress>>(generateDepositParams, ([network]) => layerswapApiClient.GenerateDepositAddress(network), { dedupingInterval: 60000 })

    const managedDepositAddress = sourceAsset?.network?.managed_accounts?.[0]?.address;
    const generatedDepositAddress = generatedDeposit?.data?.address

    const depositAddress = canDoSweeplessTransfer ? managedDepositAddress : generatedDepositAddress
    const sourceChainId = source_layer.isExchange === false && Number(source_layer.chain_id)
   
    const feeParams = {
        source: source_layer?.internal_name,
        destination: destination_layer?.internal_name,
        source_asset: source_network_asset?.asset,
        destination_asset: destination_network_asset?.asset,
        refuel: swap?.has_refuel
    }

    const { data: feeData } = useSWR<ApiResponse<Fee[]>>([feeParams], ([params]) => layerswapApiClient.GetFee(params), { dedupingInterval: 60000 })
    const walletTransferFee = feeData?.data?.find(f => f?.deposit_type === DepositType.Wallet)
    const requested_amount = walletTransferFee?.min_amount > swap?.requested_amount ? walletTransferFee?.min_amount : swap?.requested_amount

    if (sourceIsImmutableX)
        return <Wrapper>
            <ImtblxWalletWithdrawStep depositAddress={depositAddress} />
        </Wrapper>
    else if (sourceIsStarknet)
        return <Wrapper>
            <StarknetWalletWithdrawStep amount={requested_amount} depositAddress={depositAddress} />
        </Wrapper>
    return <Wrapper>
        <TransferFromWallet
            sequenceNumber={swap.sequence_number}
            swapId={swap.id}
            networkDisplayName={source_layer?.display_name}
            tokenDecimals={sourceAsset?.decimals}
            tokenContractAddress={sourceAsset?.contract_address as `0x${string}`}
            chainId={sourceChainId as number}
            depositAddress={depositAddress as `0x${string}`}
            userDestinationAddress={swap.destination_address as `0x${string}`}
            amount={requested_amount}
            asset={sourceAsset?.asset}
        />
    </Wrapper>

}

const Wrapper: FC<{ children?: React.ReactNode }> = ({ children }) => {
    return <div className='border-secondary-500 rounded-md border bg-secondary-700 p-3'>
        {children}
    </div>
}

export default WalletTransfer
