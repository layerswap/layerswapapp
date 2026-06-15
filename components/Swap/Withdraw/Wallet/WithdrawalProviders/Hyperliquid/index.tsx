import { FC } from "react";
import { Loader2 } from "lucide-react";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton } from "../../Common/buttons";
import WalletMessage from "../../../messages/Message";
import ActionMessages from "../../../messages/TransactionMessages";
import WalletIcon from "@/components/icons/WalletIcon";
import { Address } from "@/lib/address";
import { SubmittedPanel } from "./SubmittedPanel";
import { useHyperliquidWithdrawal } from "./useHyperliquidWithdrawal";

export const HyperliquidWalletWithdraw: FC<WithdrawPageProps> = (props) => {
    const { source_network } = props.swapBasicData
    const {
        handleWithdraw, loading, error, rejected, isDirect, record, hlConfig,
        isConnected, wallet, activeAddress, activeChain, sourceAddress, networks,
    } = useHyperliquidWithdrawal(props)

    if (record?.withdrawal) {
        return <SubmittedPanel isDirect={isDirect} destination={record.withdrawal.destination} realNetworkName={record.realNetwork} networks={networks} />
    }

    if (!isConnected || !wallet) {
        return <div className="w-full space-y-3">
            <WalletMessage status="pending" header="Connect your Hyperliquid wallet" details="Connect the wallet that owns your Hyperliquid balance to withdraw." />
            <ConnectWalletButton />
        </div>
    }

    if (sourceAddress && activeAddress && !Address.equals(activeAddress, sourceAddress, source_network)) {
        return <ActionMessages.WalletMismatchMessage address={sourceAddress} network={source_network} />
    }

    if (hlConfig && activeChain?.id !== hlConfig.signatureChainId) {
        return <ChangeNetworkButton chainId={hlConfig.signatureChainId} network={source_network} />
    }

    return <div className="w-full space-y-3 text-primary-text">
        {error && <WalletMessage status="error" header={error.header} details={error.details} />}
        {rejected && <ActionMessages.TransactionRejectedMessage />}
        {!loading &&
            <ButtonWrapper
                onClick={handleWithdraw}
                icon={<WalletIcon className="stroke-2 w-6 h-6" />}
            >
                {(error || rejected) ? 'Try again' : 'Withdraw from Hyperliquid'}
            </ButtonWrapper>
        }
        {loading &&
            <ButtonWrapper isSubmitting isDisabled icon={<Loader2 className="h-6 w-6 animate-spin" />}>
                Withdrawing
            </ButtonWrapper>
        }
    </div>
}
