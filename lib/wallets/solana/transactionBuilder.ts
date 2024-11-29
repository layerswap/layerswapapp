import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { Network, Token } from "../../../Models/Network";

const transactionBuilder = async (network: Network, token: Token, walletPublicKey: PublicKey, recipientAddress: string | undefined) => {

    const connection = new Connection(
        `${network.node_url}`,
        "confirmed"
    );

    if (token.contract) {
        const sourceToken = new PublicKey(token?.contract);
        const recipientPublicKey = new PublicKey(recipientAddress || '');

        const transactionInstructions: TransactionInstruction[] = [];
        const associatedTokenFrom = await getAssociatedTokenAddress(
            sourceToken,
            walletPublicKey
        );
        const fromAccount = await getAccount(connection, associatedTokenFrom);
        const associatedTokenTo = await getAssociatedTokenAddress(
            sourceToken,
            recipientPublicKey
        );

        if (!(await connection.getAccountInfo(associatedTokenTo))) {
            transactionInstructions.push(
                createAssociatedTokenAccountInstruction(
                    walletPublicKey,
                    associatedTokenTo,
                    recipientPublicKey,
                    sourceToken
                )
            );
        }
        transactionInstructions.push(
            createTransferInstruction(
                fromAccount.address,
                associatedTokenTo,
                walletPublicKey,
                2000000 * Math.pow(10, Number(token?.decimals))
            )
        );
        const result = await connection.getLatestBlockhash()

        const transaction = new Transaction({
            feePayer: walletPublicKey,
            blockhash: result.blockhash,
            lastValidBlockHeight: result.lastValidBlockHeight
        }).add(...transactionInstructions);

        return transaction
    }
    else {
        const transaction = new Transaction();
        const recipientPublicKey = new PublicKey(recipientAddress || '');
        const amountInLamports = 20000 * Math.pow(10, Number(token?.decimals));

        const transferInstruction = SystemProgram.transfer({
            fromPubkey: walletPublicKey,
            toPubkey: recipientPublicKey,
            lamports: amountInLamports
        });
        transaction.add(transferInstruction);

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletPublicKey;

        return transaction
    }
}

export default transactionBuilder