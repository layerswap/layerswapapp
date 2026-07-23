import { Network, NetworkRoute, NetworkWithTokens, Token } from "@/Models/Network"
import { TokenBalance } from "@/Models/Balance"
import { Wallet } from "./wallet"

export type TransferProps = {
    network: Network,
    token: Token,
    callData: string
    depositAddress?: string
    amount: number
    swapId?: string
    userDestinationAddress?: string
    sequenceNumber?: number;
    selectedWallet: Wallet
    balances?: TokenBalance[] | undefined | null
    /** Selected destination route. Optional — only routed sources (e.g. a CCTP-forwarded
     *  withdrawal) need to know where the swap is going; on-chain sources ignore it. */
    destinationNetwork?: Network
    destinationToken?: Token
    /** Settings networks, for per-network endpoint overrides. Optional. */
    networks?: NetworkWithTokens[]
    /** Address that owns the source balance, when it differs from the signing wallet
     *  (e.g. an off-chain account a routed source draws from). Optional. */
    sourceAddress?: string
    /** Exact decimal amount string, for sources that must sign the amount verbatim
     *  (precision-exact) rather than re-deriving it from `amount`. Optional. */
    amountExact?: string
    /** Backend source routes (from settings). Routed sources (e.g. Hyperliquid CCTP)
     *  use these to resolve the SAME destination the swap was created/priced against,
     *  so availability-based fallback can't diverge between pricing and signing. Optional. */
    sourceRoutes?: NetworkRoute[]
}

/** Generic in-flight progress a provider may surface to the UI (e.g. a prerequisite signing step). */
export type TransferProgress = { title: string; description?: string }

export interface TransferProvider {
    supportsNetwork(network: Network): boolean
    executeTransfer(params: TransferProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string>
}

// Hook-based transfer provider factory
export type TransferProviderHook = () => TransferProvider
