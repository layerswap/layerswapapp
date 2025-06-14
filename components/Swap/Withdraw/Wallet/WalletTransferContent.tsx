import { FC, useMemo } from "react";
import { useSwapDataState } from "../../../../context/swap";
import KnownInternalNames from "../../../../lib/knownIds";
import ImtblxWalletWithdrawStep from "./ImtblxWalletWithdrawStep";
import StarknetWalletWithdrawStep from "./StarknetWalletWithdraw";
import EVMWalletWithdrawal from "./WalletTransfer";
import ZkSyncWalletWithdrawStep from "./ZKsyncWalletWithdraw";
import LoopringWalletWithdraw from "./Loopring";
import { Network, NetworkType, Token } from "../../../../Models/Network";
import TonWalletWithdrawStep from "./TonWalletWithdraw";
import ParadexWalletWithdrawStep from "./paradex/index";
import FuelWalletWithdrawStep from "./FuelWalletWithdrawal";
import TronWalletWithdraw from "./TronWalletWithdraw";
import SVMWalletWithdrawStep from "./SVMWalletWithdraw";
import BitcoinWalletWithdrawStep from "./BitcoinWalletWithdraw";

//TODO have separate components for evm and none_evm as others are sweepless anyway
export const WalletTransferContent: FC = () => {
    const { swapResponse, depositActionsResponse } = useSwapDataState();
    const { swap } = swapResponse || {};
    const { source_network } = swap || {};
    const source_network_internal_name = source_network?.name;

    const WithdrawalPages = useMemo(() => [
        {
            supportedNetworks: [
                KnownInternalNames.Networks.ImmutableXMainnet,
                KnownInternalNames.Networks.ImmutableXGoerli,
                KnownInternalNames.Networks.ImmutableXSepolia
            ],
            component: ImtblxWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.StarkNetMainnet,
                KnownInternalNames.Networks.StarkNetGoerli,
                KnownInternalNames.Networks.StarkNetSepolia
            ],
            component: StarknetWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.ZksyncMainnet,
            ],
            component: ZkSyncWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.LoopringMainnet,
                KnownInternalNames.Networks.LoopringGoerli,
                KnownInternalNames.Networks.LoopringSepolia
            ],
            component: LoopringWalletWithdraw
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.TONMainnet,
                KnownInternalNames.Networks.TONTestnet
            ],
            component: TonWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.ParadexMainnet,
                KnownInternalNames.Networks.ParadexTestnet
            ],
            component: ParadexWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.FuelMainnet,
                KnownInternalNames.Networks.FuelTestnet
            ],
            component: FuelWalletWithdrawStep
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.TronMainnet
            ],
            component: TronWalletWithdraw
        },
        {
            supportedNetworks: [
                KnownInternalNames.Networks.BitcoinMainnet,
                KnownInternalNames.Networks.BitcoinTestnet
            ],
            component: BitcoinWalletWithdrawStep
        },
        {
            supportedNetworks: [
                source_network?.type == NetworkType.Solana ? source_network.name : undefined
            ],
            component: SVMWalletWithdrawStep
        },
        {
            supportedNetworks: [
                source_network?.type == NetworkType.EVM ? source_network.name : undefined
            ],
            component: EVMWalletWithdrawal
        }
    ], [source_network])

    const WithdrawalComponent = WithdrawalPages.find(page =>
        page.supportedNetworks.includes(source_network_internal_name)
    )?.component;

    const depositAddress = depositActionsResponse?.find(da => true)?.to_address;
    const amount = depositActionsResponse?.find(da => true)?.amount || 0;
    const callData = depositActionsResponse?.find(da => true)?.call_data;

    return <>
        {
            swap && WithdrawalComponent &&
            <WithdrawalComponent
                callData={callData}
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