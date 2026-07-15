import { FC } from "react";
import { Loader2 } from "lucide-react";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton } from "../../Common/buttons";
import WalletMessage from "../../../messages/Message";
import ActionMessages from "../../../messages/TransactionMessages";
import WalletIcon from "@/components/icons/WalletIcon";
import { Address } from "@/lib/address";
import { POLYMARKET_CHAIN_ID } from "@/lib/wallets/polymarket/constants";
import { usePolymarketWithdrawal } from "./usePolymarketWithdrawal";

export const PolymarketWalletWithdraw: FC<WithdrawPageProps> = (props) => {
    const { source_network } = props.swapBasicData
    const {
        handleWithdraw, loading, stage, error, rejected,
        isConnected, wallet, activeAddress, activeChain, sourceAddress,
    } = usePolymarketWithdrawal(props)

    if (!isConnected || !wallet) {
        return <div className="w-full space-y-3">
            <WalletMessage status="pending" header="Connect your Polymarket wallet" details="Connect the wallet that owns your Polymarket balance to withdraw." />
            <ConnectWalletButton />
        </div>
    }

    if (sourceAddress && activeAddress && !Address.equals(activeAddress, sourceAddress, source_network)) {
        return <ActionMessages.WalletMismatchMessage address={sourceAddress} network={source_network} />
    }

    // The gasless Safe signature is an EIP-712 message on Polygon — keep the wallet on
    // Polygon so the prompt is unambiguous. Switching networks costs no gas.
    if (activeChain?.id !== POLYMARKET_CHAIN_ID) {
        return <ChangeNetworkButton chainId={POLYMARKET_CHAIN_ID} network={source_network} />
    }

    const loadingLabel = stage === 'awaiting_signature' ? 'Confirm in your wallet'
        : stage === 'submitting' ? 'Submitting'
            : stage === 'deploying' ? 'Setting up your account'
                : 'Preparing'

    return <div className="w-full space-y-3 text-primary-text">
        {error && <WalletMessage status="error" header={error.header} details={error.details} />}
        {rejected && <ActionMessages.TransactionRejectedMessage />}
        {!loading &&
            <ButtonWrapper
                onClick={handleWithdraw}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {(error || rejected) ? 'Try again' : 'Withdraw from Polymarket'}
            </ButtonWrapper>
        }
        {loading &&
            <ButtonWrapper isSubmitting isDisabled icon={<Loader2 className="h-6 w-6 animate-spin" />}>
                {loadingLabel}
            </ButtonWrapper>
        }
    </div>
}
