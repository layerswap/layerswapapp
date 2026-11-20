import { Address, beginCell, Cell, external, loadMessage, Message, storeMessage, TonClient, Transaction } from "@ton/ton";

/**
 * Waits for a transaction to appear on-chain by incoming external message.
 *
 * Useful when the message has just been sent.
 */
export async function waitForTransaction(
    inMessageBoc: string,
    walletAddress: string,
    client: TonClient,
    retries: number = 10,
    timeout: number = 1000,
): Promise<Transaction | undefined> {
    const account = Address.parse(walletAddress);
    const returnedCell = Cell.fromBase64(inMessageBoc);
    // Some wallets return only the signed body. Rebuild its envelope for lookup only.
    const targetInMessageHashes = [getNormalizedExtMessageHash(external({ to: account, body: returnedCell }))];
    try {
        const inMessage = loadMessage(returnedCell.beginParse());
        if (inMessage.info.type === 'external-in' && inMessage.info.dest.equals(account)) {
            targetInMessageHashes.push(getNormalizedExtMessageHash(inMessage));
        }
    } catch {
        // A body-only reply is not a complete message; match its reconstructed hash instead.
    }

    for (let attempt = 0; attempt < retries; attempt++) {
        const transactions = await retry(
            () =>
                client.getTransactions(account, {
                    limit: 10,
                    archival: true,
                }),
            { delay: 1000, retries: 3 },
        );

        for (const transaction of transactions) {
            if (transaction.inMessage?.info.type !== 'external-in') {
                continue;
            }

            const inMessageHash = getNormalizedExtMessageHash(transaction.inMessage);
            if (targetInMessageHashes.some(targetHash => inMessageHash.equals(targetHash))) {
                return transaction;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, timeout));
    }

    // Transaction was not found - message may not be processed
    return undefined;
}

function getNormalizedExtMessageHash(message: Message) {
    if (message.info.type !== 'external-in') {
        throw new Error(`Message must be "external-in", got ${message.info.type}`);
    }

    const info = {
         ...message.info,
         src: undefined,
         importFee: 0n
    };

    const normalizedMessage = {
        ...message,
        init: null,
        info: info,
    };

    return beginCell()
        .store(storeMessage(normalizedMessage, { forceRef: true }))
        .endCell()
        .hash();
}

async function retry<T>(fn: () => Promise<T>, options: { retries: number; delay: number }): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < options.retries; i++) {
        try {
            return await fn();
        } catch (e) {
            if (e instanceof Error) {
                lastError = e;
            }
            await new Promise((resolve) => setTimeout(resolve, options.delay));
        }
    }
    throw lastError;
}
