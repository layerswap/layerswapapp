import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { Network, Token } from "@layerswap/widget/types";
import { buildSvmTokenTransfer } from "./buildSvmTokenTransfer";

export const transactionBuilderForGas = async (network: Network, token: Token, walletPublicKey: PublicKey, recipientAddress?: string | undefined) => {

    const connection = new Connection(
        `${network.node_url}`,
        "confirmed"
    );
    const recipientPublicKey = new PublicKey(recipientAddress || new Array(32).fill(0));

    if (token.contract) {
        const sourceToken = new PublicKey(token.contract);
        const transferAmount = 2_000_000n * 10n ** BigInt(Number(token.decimals));
        const transaction = await buildSvmTokenTransfer({
            connection,
            sourceOwner: walletPublicKey,
            destinationOwner: recipientPublicKey,
            mint: sourceToken,
            amountInBaseUnits: transferAmount,
            decimals: Number(token.decimals),
        });
        const result = await connection.getLatestBlockhash()

        transaction.recentBlockhash = result.blockhash;
        transaction.lastValidBlockHeight = result.lastValidBlockHeight;
        transaction.feePayer = walletPublicKey;

        return transaction
    }
    else {
        const transaction = new Transaction();
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
