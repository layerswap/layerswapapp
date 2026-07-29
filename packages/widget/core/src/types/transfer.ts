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
    /** Opaque token from a preceding `authorizeWithdrawal` call, binding this transfer to
     *  the quote the swap was created against. Required only by providers that implement
     *  `authorizeWithdrawal` (e.g. Lighter). Optional. */
    authorizationToken?: string
}

/** Generic in-flight progress a provider may surface to the UI (e.g. a prerequisite signing step). */
export type TransferProgress = { title: string; description?: string }

export type AuthorizeWithdrawalProps = {
    network: Network
    token: Token
    /** Address that owns the source balance. */
    sourceAddress: string
    /** Amount to authorize, verbatim (precision-exact). Interpreted per `amountBasis`. */
    amountExact: string
    /**
     * What `amountExact` denominates. 'gross' (default) — the total to debit from the
     * source account, used before the swap exists so the provider's fee comes out of it.
     * 'net' — the amount that must reach the deposit address, used when resuming a swap
     * that was already created and priced on that figure, so a fee change adjusts the
     * debit instead of shorting the swap.
     */
    amountBasis?: 'gross' | 'net'
    /** Settings networks, for per-network endpoint overrides. Optional. */
    networks?: NetworkWithTokens[]
    destinationNetwork?: Network
    destinationToken?: Token
    /** Backend source routes (from settings), so the destination resolved here matches
     *  the one the swap will be created/priced against. Optional. */
    sourceRoutes?: NetworkRoute[]
}

/**
 * Firm terms returned by `authorizeWithdrawal`, replacing the route's up-front fee
 * estimate. All amounts are decimal strings in source-token units.
 */
export type WithdrawalAuthorization = {
    /** Exact provider fee for this withdrawal. */
    fee: string
    /** Amount that will reach the deposit address (gross - fee) — what the swap is priced on. */
    netAmount: string
    /** Total debited from the source account. */
    debitAmount: string
    /** Opaque provider token binding these terms; pass back as `TransferProps.authorizationToken`. */
    authorizationToken: string
}

export interface TransferProvider {
    supportsNetwork(network: Network): boolean
    executeTransfer(params: TransferProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string>
    /**
     * Optional pre-swap step for sources that must authorize the account and pin an exact
     * provider fee BEFORE the backend swap is created. Lighter is the case this exists for:
     * its account-specific fast-withdraw fee is only knowable after the L2 signing key is
     * registered (which needs a wallet signature), and the swap must be created against the
     * exact net amount — while the bridge-liquidity check has to run first so an unavailable
     * bridge doesn't leave an unfunded swap behind.
     *
     * Providers whose fee is known up front (Hyperliquid, Polymarket) omit this; the widget
     * then goes straight to swap creation. Throws on rejection/failure like `executeTransfer`.
     */
    authorizeWithdrawal?(params: AuthorizeWithdrawalProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<WithdrawalAuthorization>
}

// Hook-based transfer provider factory
export type TransferProviderHook = () => TransferProvider
