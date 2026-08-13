import { Transaction, Connection } from '@solana/web3.js';
import { SignerWalletAdapterProps } from '@solana/wallet-adapter-base';
import { transactionSenderAndConfirmationWaiter } from './transactionBuilder';

export const configureAndSendCurrentTransaction = async (
    transaction: Transaction,
    connection: Connection,
    signTransaction: SignerWalletAdapterProps['signTransaction'],
    // Runs after the blockhash fetch so a wallet-foregrounding redirect fires
    // immediately before the sign request, not before the RPC round trip.
    onBeforeSign?: () => Promise<void>
) => {

    const blockHash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockHash.blockhash;
    transaction.lastValidBlockHeight = blockHash.lastValidBlockHeight;

    await onBeforeSign?.();
    const signed = await signTransaction(transaction);

    const res = await transactionSenderAndConfirmationWaiter({
        connection,
        serializedTransaction: signed.serialize(),
        blockhashWithExpiryBlockHeight: blockHash,
    });

    if (res?.meta?.err) {
        throw new Error(res.meta.err.toString())
    }

    return res?.transaction.signatures[0];
};
