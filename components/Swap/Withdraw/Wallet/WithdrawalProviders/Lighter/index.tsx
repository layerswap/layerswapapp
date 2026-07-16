import { FC } from "react";
import { Loader2 } from "lucide-react";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import { ButtonWrapper, ConnectWalletButton } from "../../Common/buttons";
import WalletMessage from "../../../messages/Message";
import ActionMessages from "../../../messages/TransactionMessages";
import WalletIcon from "@/components/icons/WalletIcon";
import { Address } from "@/lib/address";
import { useLighterWithdrawal } from "./useLighterWithdrawal";

export const LighterWalletWithdraw: FC<WithdrawPageProps> = (props) => {
    const { source_network } = props.swapBasicData
    const {
        handleWithdraw, loading, registering, signingWithdrawal, error, rejected,
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
        {registering && <WalletMessage status="pending" header="Approve Lighter setup" details="Sign the message to register your Lighter signing key for this wallet. This is a one-time, gasless authorization — you'll approve the withdrawal next." />}
        {signingWithdrawal && <WalletMessage status="pending" header="Approve Lighter withdrawal" details="Sign Lighter’s withdrawal message. It binds this withdrawal to the Layerswap deposit address and does not send an Ethereum transaction." />}
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
                {registering ? 'Setting up' : signingWithdrawal ? 'Awaiting signature' : 'Withdrawing'}
            </ButtonWrapper>
        }
    </div>
}
