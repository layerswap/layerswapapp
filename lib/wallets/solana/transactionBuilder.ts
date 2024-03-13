import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Layer } from "../../../Models/Layer";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { Token } from "../../../Models/Network";

const transactionBuilder = async (layer: Layer, currency: Token, walletPublicKey: PublicKey) => {
    if (!layer.tokens) return

    const connection = new Connection(
        `${layer.node_url}`,
        "confirmed"
    );

    const asset = layer?.tokens?.find(a => currency.symbol === a.symbol)

    const sourceToken = new PublicKey(asset?.contract!);
    const recipientAddress = new PublicKey('');

    const transactionInstructions: TransactionInstruction[] = [];
    const associatedTokenFrom = await getAssociatedTokenAddress(
        sourceToken,
        walletPublicKey
    );
    const fromAccount = await getAccount(connection, associatedTokenFrom);
    const associatedTokenTo = await getAssociatedTokenAddress(
        sourceToken,
        recipientAddress
    );

    if (!(await connection.getAccountInfo(associatedTokenTo))) {
        transactionInstructions.push(
            createAssociatedTokenAccountInstruction(
                walletPublicKey,
                associatedTokenTo,
                recipientAddress,
                sourceToken
            )
        );
    }
    transactionInstructions.push(
        createTransferInstruction(
            fromAccount.address,
            associatedTokenTo,
            walletPublicKey,
            20000 * Math.pow(10, Number(asset?.decimals))
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

export default transactionBuilder