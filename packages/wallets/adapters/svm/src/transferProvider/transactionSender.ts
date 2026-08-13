import { Transaction, Connection } from '@solana/web3.js';
import { SignerWalletAdapterProps } from '@solana/wallet-adapter-base';
import { transactionSenderAndConfirmationWaiter } from './transactionBuilder';

export const configureAndSendCurrentTransaction = async (
    transaction: Transaction,
    connection: Connection,
    signTransaction: SignerWalletAdapterProps['signTransaction']
) => {

    const blockHash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockHash.blockhash;
    transaction.lastValidBlockHeight = blockHash.lastValidBlockHeight;

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
