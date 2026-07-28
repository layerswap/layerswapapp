import type { TransferProps } from "@layerswap/widget/types";
import type {
    Connection,
    PublicKey,
    Transaction,
} from "@solana/web3.js";

type TokenTransferArgs = {
    params: TransferProps;
    connection: Connection;
    sourceOwner: PublicKey | null;
};

type ResolveTokenAmountArgs = {
    amount: number;
    amountExact?: string;
    amountInBaseUnits?: string;
    connection: Connection;
    mint: PublicKey;
    uiAmountToAmount: typeof import("@solana/spl-token").uiAmountToAmountForMintWithoutSimulation;
};

const deserializeTransaction = async (callData: string): Promise<Transaction> => {
    const { Transaction } = await import("@solana/web3.js");
    const bytes = Uint8Array.from(atob(callData), character => character.charCodeAt(0));
    return Transaction.from(bytes);
};

const tryDeserializeTransaction = async (
    callData: string,
): Promise<Transaction | undefined> => {
    try {
        return await deserializeTransaction(callData);
    } catch {
        return undefined;
    }
};

export const nativeTransfer = async (callData: string): Promise<Transaction> => {
    return await deserializeTransaction(callData);
};

export const tokenTransfer = async ({
    params,
    connection,
    sourceOwner,
}: TokenTransferArgs): Promise<Transaction> => {
    const {
        amount,
        amountExact,
        amountInBaseUnits,
        callData,
        depositAddress,
        token,
    } = params;

    if (!token.contract) {
        throw new Error("Missing Solana token mint");
    }

    const [
        transaction,
        { PublicKey },
        {
            TOKEN_2022_PROGRAM_ID,
            uiAmountToAmountForMintWithoutSimulation,
        },
        {
            buildSvmTokenTransfer,
            getTokenProgramId,
            transactionInvokesProgram,
        },
    ] = await Promise.all([
        tryDeserializeTransaction(callData),
        import("@solana/web3.js"),
        import("@solana/spl-token"),
        import("../utils/buildSvmTokenTransfer"),
    ]);

    const mint = new PublicKey(token.contract);
    const programId = await getTokenProgramId(connection, mint);

    if (!programId.equals(TOKEN_2022_PROGRAM_ID)) {
        if (!transaction) {
            throw new Error("Invalid Solana transaction data");
        }
        return transaction;
    }

    if (transaction && transactionInvokesProgram(transaction, TOKEN_2022_PROGRAM_ID)) {
        return transaction;
    }
    if (!depositAddress) {
        throw new Error("Missing Solana deposit address");
    }
    if (!sourceOwner) {
        throw new Error("Solana wallet public key is unavailable");
    }

    return await buildSvmTokenTransfer({
        connection,
        sourceOwner,
        destinationOwner: new PublicKey(depositAddress),
        mint,
        amountInBaseUnits: await resolveTokenAmount({
            amount,
            amountExact,
            amountInBaseUnits,
            connection,
            mint,
            uiAmountToAmount: uiAmountToAmountForMintWithoutSimulation,
        }),
        decimals: Number(token.decimals),
        programId,
    });
};

const resolveTokenAmount = async ({
    amount,
    amountExact,
    amountInBaseUnits,
    connection,
    mint,
    uiAmountToAmount,
}: ResolveTokenAmountArgs): Promise<bigint> => {
    if (amountInBaseUnits !== undefined) {
        try {
            const baseUnitAmount = BigInt(amountInBaseUnits);
            if (baseUnitAmount < 0n) throw new Error();
            return baseUnitAmount;
        } catch {
            throw new Error("Invalid Solana transfer amount in base units");
        }
    }

    return await uiAmountToAmount(
        connection,
        mint,
        amountExact ?? amount.toString(),
    );
};
