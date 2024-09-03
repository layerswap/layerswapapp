import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { Network, NetworkWithTokens, Token } from "../../../Models/Network";
import { CreatyePreHTLCParams } from "../phtlc";
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

    let [commitCounter, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("commitCounter")],
        program.programId
    );

    const commitId = new BN(await program?.methods.getCommitId().accountsPartial({ commitCounter }).view()).toArray('be', 32) as any;

    let [phtlcTokenAccount, b] = commitId && PublicKey.findProgramAddressSync(
        [Buffer.from("phtlc_token_account"), commitId],
        program.programId
    );
    let [phtlc, phtlcBump] = commitId && PublicKey.findProgramAddressSync(
        [commitId],
        program.programId
    );
    let [commits, b2] = PublicKey.findProgramAddressSync(
        [Buffer.from("commits"), walletPublicKey.toBuffer()],
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

    const LOCK_TIME = 1000 * 60 * 15 // 15 minutes
    const timeLockMS = Date.now() + LOCK_TIME
    const timeLock = Math.floor(timeLockMS / 1000)
    const TIMELOCK = new BN(timeLock);

    const lamports = tokenToLamports(Number(amount), sourceAsset.price_in_usd / network.token?.price_in_usd)
    const bnAmount = new BN(Number(amount) * Math.pow(10, 6));
    const lpAddressPublicKey = new PublicKey(lpAddress);

    const tokenContract = new PublicKey(sourceAsset.contract);

    const initCommitTx = await program.methods.initCommits().
        accountsPartial({
            sender: walletPublicKey,
            commits: commits,
        })
        .transaction();

    const commitTx = await program.methods
        .commit(commitId, hopChains, hopAssets, hopAddresses, destinationChain, destinationAsset, destination_address, sourceAsset.symbol, lpAddressPublicKey, TIMELOCK, walletPublicKey, bnAmount, phtlcBump)
        .accountsPartial({
            sender: walletPublicKey,
            phtlc: phtlc,
            phtlcTokenAccount: phtlcTokenAccount,
            commitCounter: commitCounter,
            commits: commits,
            tokenContract: tokenContract,
            senderTokenAccount: senderTokenAddress
        })
        .transaction();

    let initAndCommit = new Transaction();
    initAndCommit.add(initCommitTx);
    initAndCommit.add(commitTx);

    const blockHash = await connection.getLatestBlockhash();

    initAndCommit.recentBlockhash = blockHash.blockhash;
    initAndCommit.lastValidBlockHeight = blockHash.lastValidBlockHeight;
    initAndCommit.feePayer = walletPublicKey;
    debugger

    return { initAndCommit, commitId }
}

function tokenToLamports(usdcAmount: number, usdcToSolRate: number) {
    // USDC has 6 decimals, so multiply by 10^6
    const usdcInMicro = usdcAmount * Math.pow(10, 6);

    // Convert USDC to SOL using the provided rate (1 USDC = rate SOL)
    const solAmount = usdcInMicro * usdcToSolRate;

    // Convert SOL to lamports (1 SOL = 10^9 lamports)
    const lamports = solAmount * Math.pow(10, 9);

    return lamports;
}