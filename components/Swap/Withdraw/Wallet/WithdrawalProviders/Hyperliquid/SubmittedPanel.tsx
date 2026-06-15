import { FC } from "react";
import WalletMessage from "../../../messages/Message";
import { NetworkWithTokens } from "@/Models/Network";

type SubmittedPanelProps = {
    isDirect: boolean
    destination: string
    realNetworkName: string
    networks: NetworkWithTokens[]
}

/** Success state shown once the withdrawal has been submitted to Hyperliquid. */
export const SubmittedPanel: FC<SubmittedPanelProps> = ({ isDirect, destination, realNetworkName, networks }) => {
    const realNetwork = networks.find(n => n.name === realNetworkName)
    const explorerUrl = realNetwork?.account_explorer_template?.replace('{0}', destination)
    const realNetworkLabel = realNetwork?.display_name ?? 'the destination chain'

    const details = isDirect
        ? "Hyperliquid is releasing your USDC"
        : `Hyperliquid is releasing your USDC on ${realNetworkLabel}`

    return <div className="w-full space-y-3">
        <WalletMessage status="pending" header="Withdrawal submitted" details={details} />
        {isDirect && explorerUrl &&
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline underline-offset-2">
                View recipient on explorer
            </a>
        }
    </div>
}
