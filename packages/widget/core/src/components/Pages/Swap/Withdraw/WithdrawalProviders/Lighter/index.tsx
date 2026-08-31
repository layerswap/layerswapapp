import { FC } from "react";
import { Loader2 } from "lucide-react";
import { useLighterWithdrawal } from "./useLighterWithdrawal";
import { WithdrawPageProps } from "../../Wallet/Common/sharedTypes";
import WalletMessage from "../../messages/Message";
import { ButtonWrapper, ConnectWalletButton } from "../../Wallet/Common/buttons";
import { ActionMessages } from "../../messages/TransactionMessages";
import { Address } from "@/lib/address/Address";
import { WalletIcon } from "@layerswap/ui-kit/components";

export const LighterWalletWithdraw: FC<WithdrawPageProps> = (props) => {
    const { source_network } = props.swapBasicData
    const {
        handleWithdraw, loading, progress, error, rejected,
        isConnected, wallet, activeAddress, sourceAddress,
    } = useLighterWithdrawal(props)

    if (!isConnected || !wallet) {
        return <div className="w-full space-y-3">
            <WalletMessage status="pending" header="Connect your Lighter wallet" details="Connect the wallet that owns your Lighter balance to withdraw." />
            <ConnectWalletButton />
        </div>
    }

    if (sourceAddress && activeAddress && !Address.equals(activeAddress, sourceAddress, source_network)) {
        return <ActionMessages.WalletMismatchMessage address={sourceAddress} network={source_network} />
    }

    return <div className="w-full space-y-3 text-primary-text">
        {error && <WalletMessage status="error" header={error.header} details={error.details} />}
        {rejected && <ActionMessages.TransactionRejectedMessage />}
        {/* Provider-surfaced signing step (one-time Lighter setup, then the withdrawal itself). */}
        {progress && <WalletMessage status="pending" header={progress.title} details={progress.description ?? ''} />}
        {!loading &&
            <ButtonWrapper
                onClick={handleWithdraw}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {(error || rejected) ? 'Try again' : 'Withdraw from Lighter'}
            </ButtonWrapper>
        }
        {loading &&
            <ButtonWrapper isSubmitting isDisabled icon={<Loader2 className="h-6 w-6 animate-spin" />}>
                {progress ? 'Awaiting signature' : 'Withdrawing'}
            </ButtonWrapper>
        }
    </div>
}
