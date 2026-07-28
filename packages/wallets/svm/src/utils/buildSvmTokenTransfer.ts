import {
    Connection,
    PublicKey,
    Transaction,
} from "@solana/web3.js";
import {
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountIdempotentInstruction,
    createTransferCheckedInstruction,
    createTransferCheckedWithTransferHookInstruction,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";

type BuildSvmTokenTransferArgs = {
    connection: Connection;
    sourceOwner: PublicKey;
    destinationOwner: PublicKey;
    mint: PublicKey;
    amountInBaseUnits: bigint;
    decimals: number;
    programId?: PublicKey;
};

export async function buildSvmTokenTransfer({
    connection,
    sourceOwner,
    destinationOwner,
    mint,
    amountInBaseUnits,
    decimals,
    programId: suppliedProgramId,
}: BuildSvmTokenTransferArgs): Promise<Transaction> {
    const programId = suppliedProgramId
        ?? await getTokenProgramId(connection, mint);

    const sourceTokenAccount = getAssociatedTokenAddressSync(
        mint,
        sourceOwner,
        false,
        programId,
    );
    const destinationTokenAccount = getAssociatedTokenAddressSync(
        mint,
        destinationOwner,
        false,
        programId,
    );
    const createDestinationAccountInstruction =
        createAssociatedTokenAccountIdempotentInstruction(
            sourceOwner,
            destinationTokenAccount,
            destinationOwner,
            mint,
            programId,
        );

    const transferInstruction = programId.equals(TOKEN_2022_PROGRAM_ID)
        ? await createTransferCheckedWithTransferHookInstruction(
            connection,
            sourceTokenAccount,
            mint,
            destinationTokenAccount,
            sourceOwner,
            amountInBaseUnits,
            decimals,
            [],
            "confirmed",
            programId,
        )
        : createTransferCheckedInstruction(
            sourceTokenAccount,
            mint,
            destinationTokenAccount,
            sourceOwner,
            amountInBaseUnits,
            decimals,
            [],
            programId,
        );

    const transaction = new Transaction();
    transaction.feePayer = sourceOwner;
    transaction.add(createDestinationAccountInstruction, transferInstruction);
    return transaction;
}

export async function getTokenProgramId(
    connection: Connection,
    mint: PublicKey,
): Promise<PublicKey> {
    const mintAccount = await connection.getAccountInfo(mint, "confirmed");
    const programId = mintAccount?.owner;

    if (
        !programId?.equals(TOKEN_PROGRAM_ID)
        && !programId?.equals(TOKEN_2022_PROGRAM_ID)
    ) {
        throw new Error(`Unsupported Solana token mint: ${mint.toBase58()}`);
    }

    return programId;
}

export function transactionInvokesProgram(
    transaction: Transaction,
    programId: PublicKey,
): boolean {
    return transaction.instructions.some(instruction =>
        instruction.programId.equals(programId)
    );
}
