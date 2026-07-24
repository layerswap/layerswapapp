import {
    BlockhashWithExpiryBlockHeight,
    Connection,
    TransactionExpiredBlockheightExceededError,
    VersionedTransactionResponse,
} from "@solana/web3.js";
import { retry, sleep } from "@layerswap/widget/internal";

type TransactionSenderAndConfirmationWaiterArgs = {
    connection: Connection;
    serializedTransaction: Buffer;
    blockhashWithExpiryBlockHeight: BlockhashWithExpiryBlockHeight;
};

const SEND_OPTIONS = {
    skipPreflight: true,
};

export async function transactionSenderAndConfirmationWaiter({
    connection,
    serializedTransaction,
    blockhashWithExpiryBlockHeight,
}: TransactionSenderAndConfirmationWaiterArgs): Promise<VersionedTransactionResponse | null> {
    const txid = await connection.sendRawTransaction(
        serializedTransaction,
        SEND_OPTIONS
    );

    const controller = new AbortController();
    const abortSignal = controller.signal;

    const abortableResender = async () => {
        while (true) {
            await sleep(2000);
            if (abortSignal.aborted) return;
            try {
                await connection.sendRawTransaction(
                    serializedTransaction,
                    SEND_OPTIONS
                );
            } catch (e) {
                console.warn(`Failed to resend transaction: ${e}`);
            }
        }
    };

    try {
        abortableResender();
        const lastValidBlockHeight =
            blockhashWithExpiryBlockHeight.lastValidBlockHeight;

        // this would throw TransactionExpiredBlockheightExceededError
        await Promise.race([
            connection.confirmTransaction(
                {
                    ...blockhashWithExpiryBlockHeight,
                    lastValidBlockHeight,
                    signature: txid,
                },
                "confirmed"
            ),
            new Promise(async (resolve) => {
                // in case ws socket died
                while (!abortSignal.aborted) {
                    await sleep(2000);
                    const tx = await connection.getSignatureStatus(txid, {
                        searchTransactionHistory: false,
                    });
                    if (tx?.value?.confirmationStatus === "confirmed") {
                        resolve(tx);
                    }
                }
            }),
        ]);
    } catch (e) {
        if (e instanceof TransactionExpiredBlockheightExceededError) {
            // we consume this error and getTransaction would return null
            return null;
        } else {
            // invalid state from web3.js
            throw e;
        }
    } finally {
        controller.abort();
    }

    // in case rpc is not synced yet, we add some retries
    const response = retry(
        async () => {
            const response = await connection.getTransaction(txid, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });
            if (!response) {
                throw new Error("Transaction not found");
            }
            return response;
        }
    );

    return response;
}