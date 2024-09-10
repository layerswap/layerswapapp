import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { Network, NetworkWithTokens, Token } from "../../../Models/Network";
import { CommitmentParams, CreatyePreHTLCParams, LockParams } from "../phtlc";
import { BN, Idl, Program } from "@coral-xyz/anchor";

export const transactionBuilder = async (network: Network, token: Token, walletPublicKey: PublicKey) => {

    const connection = new Connection(
        `${network.node_url}`,
        "confirmed"
    );

    const sourceToken = new PublicKey(token?.contract!);
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
            20000 * Math.pow(10, Number(token?.decimals))
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

export const phtlcTransactionBuilder = async (params: CreatyePreHTLCParams & { program: Program<Idl>, connection: Connection, walletPublicKey: PublicKey, network: NetworkWithTokens }) => {

    const { destinationChain, destinationAsset, sourceAsset, lpAddress, address: destination_address, amount, atomicContract, chainId, program, walletPublicKey, connection, network } = params

    if (!sourceAsset.contract || !network.token) return null

    const LOCK_TIME = 1000 * 60 * 15 // 15 minutes
    const timeLockMS = Date.now() + LOCK_TIME
    const timeLock = Math.floor(timeLockMS / 1000)
    const bnTimelock = new BN(timeLock);

    const lpAddressPublicKey = new PublicKey(lpAddress);

    const bnAmount = new BN(Number(amount) * Math.pow(10, 6));

    const commitId = await program?.methods.getCommitId(bnAmount, bnTimelock).accountsPartial({ sender: walletPublicKey, receiver: lpAddressPublicKey }).view();

    let [phtlcTokenAccount, b] = commitId && PublicKey.findProgramAddressSync(
        [Buffer.from("phtlc_token_account"), commitId],
        program.programId
    );
    let [phtlc, phtlcBump] = commitId && PublicKey.findProgramAddressSync(
        [commitId],
        program.programId
    );

    const hopChains = [destinationChain]
    const hopAssets = [destinationAsset]
    const hopAddresses = [lpAddress]

    const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contract), walletPublicKey);

    if (!walletPublicKey) {
        throw Error("Wallet not connected")
    }
    if (isNaN(Number(chainId))) {
        throw Error("Invalid source chain")
    }
    if (!lpAddress) {
        throw Error("No LP address")
    }
    if (!atomicContract) {
        throw Error("No contract address")
    }

    const tokenContract = new PublicKey(sourceAsset.contract);

    const commitTx = await program.methods
        .commit(commitId, hopChains, hopAssets, hopAddresses, destinationChain, destinationAsset, destination_address, sourceAsset.symbol, lpAddressPublicKey, bnTimelock, walletPublicKey, bnAmount, phtlcBump)
        .accountsPartial({
            sender: walletPublicKey,
            phtlc: phtlc,
            phtlcTokenAccount: phtlcTokenAccount,
            tokenContract: tokenContract,
            senderTokenAccount: senderTokenAddress
        })
        .transaction();

    let commit = new Transaction();
    commit.add(commitTx);

    const blockHash = await connection.getLatestBlockhash();

    commit.recentBlockhash = blockHash.blockhash;
    commit.lastValidBlockHeight = blockHash.lastValidBlockHeight;
    commit.feePayer = walletPublicKey;

    return { initAndCommit: commit, commitId: commitId }
}

export const lockTransactionBuilder = async (params: CommitmentParams & LockParams & { program: Program<Idl>, connection: Connection, walletPublicKey: PublicKey, network: NetworkWithTokens }) => {
    const { walletPublicKey, commitId, connection, lockId, network, program, lockData } = params
    const token = network?.tokens.find(t => t.symbol === lockData?.dstAsset)

    if (!program) {
        throw Error("No program")
    }
    if (!token?.contract) {
        throw Error("No token contract")
    }
    if (!walletPublicKey) {
        throw Error("No Wallet public key")
    }

    const LOCK_TIME = 1000 * 60 * 15 // 15 minutes
    const timeLockMS = Date.now() + LOCK_TIME
    const timeLock = Math.floor(timeLockMS / 1000)
    const TIMELOCK = new BN(timeLock);

    const commitIdBuffer = Buffer.from(commitId.replace('0x', ''), 'hex');
    const lockIdBuffer = Buffer.from(lockId.replace('0x', ''), 'hex');
    let [htlc, htlcBump]: any = lockId && PublicKey.findProgramAddressSync(
        [lockIdBuffer],
        program.programId
    );
    let [phtlc, phtlcBump]: any = commitId && PublicKey.findProgramAddressSync(
        [commitIdBuffer],
        program.programId
    );
    let [htlcTokenAccount, bump2]: any = lockId && PublicKey.findProgramAddressSync(
        [Buffer.from("htlc_token_account"), lockIdBuffer],
        program.programId
    );
    let [phtlcTokenAccount, bump3]: any = commitId && PublicKey.findProgramAddressSync(
        [Buffer.from("phtlc_token_account"), commitIdBuffer],
        program.programId
    );

    const lockTx = await program.methods.lockCommit(commitIdBuffer, lockIdBuffer, TIMELOCK, phtlcBump)
        .accountsPartial({
            messenger: walletPublicKey,
            phtlc: phtlc,
            htlc: htlc,
            phtlcTokenAccount: phtlcTokenAccount,
            htlcTokenAccount: htlcTokenAccount,
            tokenContract: new PublicKey(token.contract),
        })
        .transaction();

    let lockCommit = new Transaction();
    lockCommit.add(lockTx);

    const blockHash = await connection.getLatestBlockhash();

    lockCommit.recentBlockhash = blockHash.blockhash;
    lockCommit.lastValidBlockHeight = blockHash.lastValidBlockHeight;
    lockCommit.feePayer = walletPublicKey;

    return { lockCommit, lockId: lockIdBuffer }
}