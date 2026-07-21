import { TransferProvider, TransferProps, Network, ActionMessageType, Wallet } from "@layerswap/widget/types"
import { isMobile } from "@layerswap/widget/internal"
import { isWalletInfoRemote } from "@tonconnect/sdk"
import { transactionBuilder } from "./transactionBuilder"
import { waitForTransaction } from "./waitForTransaction"
import { createTonClient } from "../client"
import { getTonApiKey, getTonConnect } from "../service/getTonConnect"
import { useTonStore } from "../service/tonStore"

export function createTonTransfer(): TransferProvider {
    return {
        supportsNetwork(network: Network): boolean {
            return network.name.toLowerCase().includes('ton')
        },

        async executeTransfer(params: TransferProps, wallet?: Wallet): Promise<string> {
            const tonConnect = getTonConnect()
            const tonApiKey = getTonApiKey()

            const { amount, callData, depositAddress, token } = params

            if (!wallet?.address) {
                throw new Error('Wallet address not found')
            }
            if (!depositAddress) {
                throw new Error('Deposit address not found')
            }

            try {
                const transaction = await transactionBuilder(
                    amount,
                    token,
                    depositAddress,
                    wallet.address,
                    callData,
                    tonApiKey,
                )

                const res = await tonConnect.sendTransaction(transaction, {
                    onRequestSent: openWalletAppForConfirmation,
                })
                const tonClient = createTonClient(tonApiKey)

                const tx = await waitForTransaction(res.boc, tonClient)

                if (tx?.hash) {
                    return tx.hash.toString()
                }

                throw new Error("No transaction BOC returned")
            } catch (error) {
                const e = new Error()
                e.message = error instanceof Error ? error.message : String(error)

                if (typeof error === 'string' && error?.includes('Reject request')) {
                    e.name = ActionMessageType.TransactionRejected
                    throw e
                } else if (typeof error === 'string' && error?.includes('Transaction was not sent')) {
                    e.name = ActionMessageType.TransactionFailed
                    throw e
                } else {
                    e.name = ActionMessageType.UnexpectedErrorMessage
                    throw e
                }
            }
        },
    }
}

/**
 * The headless SDK's `sendTransaction` only posts the request to the bridge —
 * unlike `tonConnectUI.sendTransaction` it renders no confirmation UI and
 * doesn't deep-link into the wallet. On mobile bridge (http) sessions the
 * wallet app must be foregrounded to show its confirmation screen, so mirror
 * the connect flow's deep-linking once the request is on the bridge. Injected
 * sessions surface their own in-page confirmation and need no redirect.
 */
function openWalletAppForConfirmation(): void {
    if (!isMobile()) return
    const tonConnect = getTonConnect()
    if (tonConnect.wallet?.provider !== 'http') return

    const { wallets, tonWallet } = useTonStore.getState()
    const walletInfo = wallets.find(w => w.appName === tonWallet?.appName)
    if (!walletInfo || !isWalletInfoRemote(walletInfo)) return

    // Prefer the wallet's native scheme (launches the app directly); fall back
    // to the universal link for wallets that don't publish one.
    const link = walletInfo.deepLink || walletInfo.universalLink
    if (!link) return
    try {
        window.location.href = link
    } catch {
        // Best-effort — the user can still open the wallet app manually.
    }
}
