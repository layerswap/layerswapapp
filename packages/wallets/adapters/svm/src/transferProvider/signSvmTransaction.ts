import type { Transaction as KitTransaction } from '@solana/kit'
import type { SignerWalletAdapter } from '@solana/wallet-adapter-base'
import { SolanaSignTransaction } from '@solana/wallet-standard-features'
import { StandardWalletAdapter } from '@solana/wallet-standard-wallet-adapter-base'
import { Transaction, VersionedTransaction } from '@solana/web3.js'
import { SolanaWalletConnectAdapter } from '../connectors/SolanaWalletConnectAdapter'
import { getSvmTransactionVersion, serializeSvmTransaction } from './svmTransaction'

export function getSvmTransactionSigner(adapter: SignerWalletAdapter, transaction: KitTransaction) {
    const version = getSvmTransactionVersion(transaction)
    if (version !== 1) {
        if (version === 0 && !adapter.supportedTransactionVersions?.has(0)) {
            throw new Error(`${adapter.name} does not support Solana v0 transactions`)
        }
        return async (prepared: KitTransaction): Promise<Uint8Array> => {
            const bytes = serializeSvmTransaction(prepared)
            const legacyOrV0 = version === 'legacy' ? Transaction.from(bytes) : VersionedTransaction.deserialize(bytes)
            const signed = await adapter.signTransaction(legacyOrV0)
            return new Uint8Array(signed.serialize())
        }
    }

    if (adapter instanceof SolanaWalletConnectAdapter) {
        return (prepared: KitTransaction) => adapter.signSerializedTransaction(serializeSvmTransaction(prepared))
    }

    if (adapter instanceof StandardWalletAdapter) {
        const feature = adapter.wallet.features[SolanaSignTransaction]
        const account = adapter.wallet.accounts.find(candidate => candidate.address === adapter.publicKey?.toBase58())
        // Wallet Standard's published union still names legacy/v0; newer wallets advertise 1 at runtime.
        const versions: readonly (string | number)[] = feature?.supportedTransactionVersions ?? []
        if (feature && account?.features.includes(SolanaSignTransaction) && versions.includes(1)) {
            return async (prepared: KitTransaction): Promise<Uint8Array> => {
                const [result] = await feature.signTransaction({ account, transaction: serializeSvmTransaction(prepared) })
                if (!result) throw new Error('The wallet returned no signed Solana transaction')
                return result.signedTransaction
            }
        }
    }

    throw new Error(`${adapter.name} does not support Solana v1 transaction signing. Use a compatible wallet.`)
}
