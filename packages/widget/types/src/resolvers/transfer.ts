import { type Wallet } from '../wallet';
import { Network, NetworkRoute, NetworkWithTokens, Token } from "../types"
import { TokenBalance } from "./balanceModels"

export type TransferProps = {
    network: Network,
    token: Token,
    callData: string
    amountInBaseUnits?: string
    encodedArgs?: string[] | null
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
    /** Backend source routes (from settings). Routed sources (e.g. Hyperliquid CCTP)
     *  use these to resolve the SAME destination the swap was created/priced against,
     *  so availability-based fallback can't diverge between pricing and signing. Optional. */
    sourceRoutes?: NetworkRoute[]
    /** Opt-in submission tracking for relayed withdrawals. Report `preparing` before
     *  setup/signing and `submitting` before sending the signed withdrawal to the
     *  provider. Report `not_submitted` only after a definitive provider refusal;
     *  transport failures and ambiguous responses must remain `submitting`. */
    onSubmissionStateChange?: (state: 'preparing' | 'submitting' | 'not_submitted') => void
}

/** Generic in-flight progress a provider may surface to the UI (e.g. a prerequisite signing step). */
export type TransferProgress = { title: string; description?: string }

export interface TransferProvider {
    atomicBatch?: AtomicBatchProvider
    supportsNetwork(network: Network): boolean
    executeTransfer(params: TransferProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string>
}

export type AtomicBatchContext = {
    network: Network
    wallet: Wallet
    account: string
    signal?: AbortSignal
    onWalletPrompt?: () => void
}

export type AtomicBatchCall = { to: `0x${string}`; data: `0x${string}`; value: bigint }

/** IDs belong to the wallet call API and are never transaction hashes. */
export interface AtomicBatchProvider {
    getCapabilities(context: AtomicBatchContext, options?: { fresh?: boolean }): Promise<'supported' | 'ready' | 'unsupported'>
    submit(context: AtomicBatchContext & { calls: AtomicBatchCall[]; validBefore: number }): Promise<{ id: string }>
    getStatus(context: AtomicBatchContext, id: string): Promise<unknown>
}
