import { FC } from "react";
import { Loader2 } from "lucide-react";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import { ButtonWrapper, ChangeNetworkButton, ConnectWalletButton } from "../../Common/buttons";
import WalletMessage from "../../../messages/Message";
import ActionMessages from "../../../messages/TransactionMessages";
import WalletIcon from "@/components/icons/WalletIcon";
import { Address } from "@/lib/address";
import { useHyperliquidWithdrawal } from "./useHyperliquidWithdrawal";

export const HyperliquidWalletWithdraw: FC<WithdrawPageProps> = (props) => {
    const { source_network, source_token } = props.swapBasicData
    const {
        handleWithdraw, loading, consolidation, error, rejected, hlConfig,
        isConnected, wallet, activeAddress, activeChain, sourceAddress,
    } = useHyperliquidWithdrawal(props)

    // Explain the extra, internal-only signature when we move USDC between the
    // user's Hyperliquid Spot/Perps pools so the withdrawal can be funded.
    let consolidationMessage: { header: string; details: string } | undefined
    if (consolidation) {
        const fromLabel = consolidation.toPerp ? 'Spot' : 'Perps'
        const toLabel = consolidation.toPerp ? 'Perps' : 'Spot'
        const symbol = source_token.symbol
        consolidationMessage = consolidation.step === 'sign'
            ? {
                header: 'Approve moving your balance',
                details: `Moving ${consolidation.amount} ${symbol} from your Hyperliquid ${fromLabel} balance to ${toLabel} so this withdrawal can be funded. The funds stay on Hyperliquid and there's no fee — you'll approve the withdrawal itself next.`,
            }
            : {
                header: 'Updating your balance',
                details: 'Applying the move on Hyperliquid. This usually takes a few seconds…',
            }
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
        {consolidationMessage && <WalletMessage status="pending" header={consolidationMessage.header} details={consolidationMessage.details} />}
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
                {consolidation ? 'Preparing balance' : 'Withdrawing'}
            </ButtonWrapper>
        }
    </div>
}
