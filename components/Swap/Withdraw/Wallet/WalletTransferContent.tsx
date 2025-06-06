import { FC } from "react";
import { useSwapDataState } from "../../../../context/swap";
import KnownInternalNames from "../../../../lib/knownIds";
import ImtblxWalletWithdrawStep from "./ImtblxWalletWithdrawStep";
import StarknetWalletWithdrawStep from "./StarknetWalletWithdraw";
import TransferFromWallet from "./WalletTransfer";
import ZkSyncWalletWithdrawStep from "./ZKsyncWalletWithdraw";
import LoopringWalletWithdraw from "./Loopring";
import { Network, NetworkType, Token } from "../../../../Models/Network";
import TonWalletWithdrawStep from "./TonWalletWithdraw";
import ParadexWalletWithdrawStep from "./paradex/index";
import FuelWalletWithdrawStep from "./FuelWalletWithdrawal";
import TronWalletWithdraw from "./TronWalletWithdraw";
import SVMWalletWithdrawStep from "./SVMWalletWithdraw";

//TODO have separate components for evm and none_evm as others are sweepless anyway
export const WalletTransferContent: FC = () => {
    const { swapResponse, depositActionsResponse } = useSwapDataState();
    const { swap } = swapResponse || {};

    const { source_network } = swap || {};
    const source_network_internal_name = source_network?.name;

    const sourceIsImmutableX = swap?.source_network?.name?.toUpperCase() === KnownInternalNames.Networks.ImmutableXMainnet?.toUpperCase()
        || swap?.source_network.name === KnownInternalNames.Networks.ImmutableXGoerli?.toUpperCase()
        || swap?.source_network.name === KnownInternalNames.Networks.ImmutableXSepolia?.toUpperCase();

    const sourceIsZkSync = swap?.source_network?.name?.toUpperCase() === KnownInternalNames.Networks.ZksyncMainnet?.toUpperCase();

    const sourceIsStarknet = swap?.source_network?.name?.toUpperCase() === KnownInternalNames.Networks.StarkNetMainnet?.toUpperCase()
        || swap?.source_network.name === KnownInternalNames.Networks.StarkNetGoerli?.toUpperCase()
        || swap?.source_network.name === KnownInternalNames.Networks.StarkNetSepolia?.toUpperCase();

    const sourceIsLoopring = swap?.source_network?.name?.toUpperCase() === KnownInternalNames.Networks.LoopringMainnet?.toUpperCase()
        || swap?.source_network?.name?.toUpperCase() === KnownInternalNames.Networks.LoopringGoerli?.toUpperCase()
        || swap?.source_network?.name?.toUpperCase() === KnownInternalNames.Networks.LoopringSepolia?.toUpperCase();

    const sourceIsSVM = source_network?.type === NetworkType.Solana

    const sourceIsTon = source_network_internal_name?.toUpperCase() === KnownInternalNames.Networks.TONMainnet?.toUpperCase()

    const sourceIsParadex = source_network_internal_name?.toUpperCase() === KnownInternalNames.Networks.ParadexMainnet?.toUpperCase()
        || source_network_internal_name?.toUpperCase() === KnownInternalNames.Networks.ParadexTestnet?.toUpperCase();

    const sourceIsFuel = source_network_internal_name?.toUpperCase() === KnownInternalNames.Networks.FuelMainnet?.toUpperCase()
        || source_network_internal_name?.toUpperCase() === KnownInternalNames.Networks.FuelTestnet?.toUpperCase();

    const sourceIsTron = source_network_internal_name?.toUpperCase() === KnownInternalNames.Networks.TronMainnet?.toUpperCase()

    const depositAddress = depositActionsResponse?.find(da => true)?.to_address;
    const amount = depositActionsResponse?.find(da => true)?.amount || 0;
    const callData = depositActionsResponse?.find(da => true)?.call_data;
    if (sourceIsImmutableX)
        return <ImtblxWalletWithdrawStep
            amount={amount}
            depositAddress={depositAddress}
            network={swap?.source_network}
            token={swap?.source_token}
            swapId={swap?.id}
        />;
    else if (sourceIsStarknet)
        return <StarknetWalletWithdrawStep
            network={swap?.source_network}
            token={swap?.source_token}
            swapId={swap?.id}
            callData={callData}
        />;
    else if (sourceIsZkSync)
        return <ZkSyncWalletWithdrawStep
            amount={amount}
            depositAddress={depositAddress}
            network={swap?.source_network}
            token={swap?.source_token}
            swapId={swap?.id}
            sequenceNumber={swap.metadata.sequence_number}
        />;
    else if (sourceIsLoopring)
        return <LoopringWalletWithdraw
            amount={amount}
            depositAddress={depositAddress}
            network={swap?.source_network}
            token={swap?.source_token}
            swapId={swap?.id}
            callData={callData}
        />;
    else if (sourceIsSVM)
        return <SVMWalletWithdrawStep
            amount={amount}
            depositAddress={depositAddress}
            network={swap?.source_network}
            token={swap?.source_token}
            swapId={swap?.id}
            callData={callData}
        />;
    else if (sourceIsTon)
        return <TonWalletWithdrawStep
            amount={amount}
            depositAddress={depositAddress}
            network={swap?.source_network}
            token={swap?.source_token}
            swapId={swap?.id}
            callData={callData}
        />;
    else if (sourceIsParadex)
        return <ParadexWalletWithdrawStep
            amount={amount}
            depositAddress={depositAddress}
            network={swap?.source_network}
            token={swap?.source_token}
            swapId={swap?.id}
            callData={callData}
        />;
    else if (sourceIsFuel)
        return <FuelWalletWithdrawStep
            amount={amount}
            depositAddress={depositAddress}
            network={swap?.source_network}
            token={swap?.source_token}
            sequenceNumber={swap?.metadata.sequence_number}
            swapId={swap?.id}
            callData={callData}
        />
    else if (sourceIsTron)
        return <TronWalletWithdraw
            amount={amount}
            depositAddress={depositAddress}
            network={swap?.source_network}
            token={swap?.source_token}
            swapId={swap?.id}
            callData={callData}
        />;
    else
        return <>
            {
                swap &&
                <TransferFromWallet
                    sequenceNumber={swap?.metadata.sequence_number}
                    swapId={swap.id}
                    network={swap.source_network}
                    token={swap.source_token}
                    depositAddress={depositAddress}
                    userDestinationAddress={swap.destination_address}
                    amount={amount}
                />
            }
        </>;
};


export type WithdrawPageProps = {
    depositAddress?: string
    amount?: number
    swapId?: string
    userDestinationAddress?: string
    sequenceNumber?: number
    network?: Network
    token?: Token
    callData?: string
}