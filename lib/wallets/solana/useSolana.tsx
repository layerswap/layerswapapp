import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { useWallet } from "@solana/wallet-adapter-react"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { use, useEffect, useState } from "react"
import * as anchor from "@coral-xyz/anchor";
import { PDAParameters, usePDAStore } from "../../../stores/pdaStore"
import { CommitmentParams, CreatyePreHTLCParams, LockParams, RefundParams } from "../phtlc"
import { AnchorHtlc } from "./anchorHTLC"
import { AssetLock, Commit } from "../../../Models/PHTLC"

export default function useSolana(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet]
    const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;
    const TIME = new Date().getTime();
    const TIMELOC = (TIME + 4500) / 1000;
    const TIMELOCK = new anchor.BN(TIMELOC);
    const name = 'solana'
    const { publicKey, disconnect, wallet } = useWallet();
    const { setVisible } = useWalletModal();

    const getWallet = () => {
        if (publicKey) {
            return {
                address: publicKey?.toBase58(),
                connector: wallet?.adapter?.name,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: String(wallet?.adapter.name), address: publicKey?.toBase58() })
            }
        }
    }

    const connectWallet = () => {
        return setVisible && setVisible(true)
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async () => {
        await disconnectWallet()
        connectWallet()
    }


    const createPreHTLC = async (params: CreatyePreHTLCParams) => {
        const pda = await getPdaParams({})
        const { destinationChain, destinationAsset, sourceAsset, lpAddress, address, amount, decimals, atomicContract, chainId } = params
        const hopChains = [destinationChain]
        const hopAssets = [destinationAsset]
        const hopAddresses = [lpAddress]
        if (!wallet || !publicKey) {
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
        if (!pda) {
            throw Error("No PDA found")
        }

        const commitCounterArray = Array.from(new Uint8Array(pda.commitCounter.toBuffer()));


        console.log(`[${TIMELOC * 1000}] the Timelock`);
        debugger
        const tx1 = await program.methods
            .commit(commitCounterArray, hopChains, hopAssets, hopAddresses, destinationChain, destinationAsset, address, sourceAsset.symbol, publicKey, TIMELOCK, publicKey, new anchor.BN(amount), pda.phtlcBump)
            .accountsPartial({
                sender: publicKey,
                phtlc: pda.phtlcKey,
                phtlcTokenAccount: pda.phtlcTokenAccount,
                commitCounter: pda.commitCounter,
                senderTokenAccount: publicKey
            })
            .rpc();
    }

    const getCommitment = async (params: CommitmentParams): Promise<Commit> => {

        const { chainId, commitId, contractAddress, type } = params
        const pda = await getPdaParams({ commitId })
        const commitIdBuffer = Buffer.from(commitId);

        const result = await program.methods.getCommitDetails(Array.from(commitIdBuffer), pda.htlcBump).accountsPartial({ phtlc: commitId }).rpc();

        if (!result) {
            throw new Error("No result")
        }
        return result as Commit
    }

    const getLockIdByCommitId = async (params: CommitmentParams) => {
        const { chainId, commitId, contractAddress, type } = params
        const pda = await getPdaParams({ commitId })
        const commitIdBuffer = Buffer.from(commitId);

        const result = await program.methods.getLockIdByCommitId(Array.from(commitIdBuffer)).accountsPartial({ lockIdStruct: pda.lockIdStruct }).rpc();

        if (!result || result === '0x0000000000000000000000000000000000000000000000000000000000000000') return null

        return result as `0x${string}`
    }

    const lockCommitment = async (params: CommitmentParams & LockParams) => {
        const { chainId, commitId, contractAddress, lockId, type } = params
        const pda = await getPdaParams({ commitId, lockId })

        const commitIdBuffer = Buffer.from(commitId);
        const lockIdBuffer = Buffer.from(lockId);

        const result = await program.methods.lockCommit(Array.from(commitIdBuffer), Array.from(lockIdBuffer), TIMELOCK, pda.htlcBump).
            accountsPartial({
                messenger: publicKey,
                phtlc: pda.phtlcKey,
                htlc: pda.htlcKey,
                phtlcTokenAccount: pda.phtlcTokenAccount,
                htlcTokenAccount: pda.htlcTokenAccount,
                tokenContract: tokenMint,
            }).rpc();

        return { result: result }
    }

    const getLock = async (params: LockParams): Promise<AssetLock> => {
        const { lockId, commitId } = params
        const pda = await getPdaParams({ commitId, lockId })

        const lockIdBuffer = Buffer.from(lockId);
        const lockIdPublicKey = new anchor.web3.PublicKey(lockIdBuffer);
        const result = await program.methods.getLockDetails(Array.from(lockIdBuffer), pda.htlcBump).accountsPartial({ htlc: lockIdPublicKey }).rpc();

        if (!result) {
            throw new Error("No result")
        }
        return result as AssetLock
    }

    const refund = async (params: RefundParams) => {
        const { chainId, lockId, commit, commitId, contractAddress, type } = params
        const pda = await getPdaParams({ commitId, lockId })

        if (commit.locked && !lockId) {
            throw new Error("No lockId")
        }

        if (commit.locked && lockId) {
            const lockIdBuffer = Buffer.from(lockId);
            const result = await program.methods.unlock(Array.from(lockIdBuffer), pda.htlcBump).accountsPartial({
                userSigning: publicKey,
                htlc: pda.htlcKey,
                htlcTokenAccount: pda.htlcTokenAccount,
                sender: publicKey,
                tokenContract: tokenMint,
                senderTokenAccount: aliceWallet,
            }).rpc();
            return { result: result }
        } else {
            const commitIdBuffer = Buffer.from(commitId);
            const result = await program.methods.uncommit(Array.from(commitIdBuffer), pda.htlcBump).accountsPartial({
                userSigning: publicKey,
                phtlc: pda.phtlcKey,
                phtlcTokenAccount: pda.phtlcTokenAccount,
                sender: publicKey,
                tokenContract: tokenMint,
                senderTokenAccount: aliceWallet,
            }).rpc();
            return { result: result }
        }
    }

    return {
        getConnectedWallet: getWallet,
        connectWallet,
        disconnectWallet,
        reconnectWallet,
        withdrawalSupportedNetworks,
        autofillSupportedNetworks: withdrawalSupportedNetworks,
        asSourceSupportedNetworks: withdrawalSupportedNetworks,
        name,

        createPreHTLC,
        getCommitment,
        getLockIdByCommitId,
        lockCommitment,
        getLock,
        refund

    }
}


const getPdaParams = async ({
    lockId,
    commitId
}: {
    lockId?: any | undefined,
    commitId?: any | undefined,
}): Promise<PDAParameters> => {
    const program = anchor.workspace.AnchorHtlc as anchor.Program<AnchorHtlc>;

    // let pseed = commitId.toBuffer('le', 8);
    // let pseed = Buffer.from(commitId);
    let [htlc, htlcBump] = lockId && await anchor.web3.PublicKey.findProgramAddressSync(
        [lockId],
        program.programId
    );
    let [htlcTokenAccount, bump2] = lockId && await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("htlc_token_account"), lockId],
        program.programId
    );
    let [phtlc, phtlcBump] = commitId && await anchor.web3.PublicKey.findProgramAddressSync(
        [commitId],
        program.programId
    );
    let [phtlcTokenAccount, bump3] = commitId && await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("phtlc_token_account"), commitId],
        program.programId
    );
    let [commitCounter, _] = await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("commitCounter")],
        program.programId
    );
    let [lockIdStruct, _b] = commitId && await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("commit_to_lock"), commitId],
        program.programId
    );
    return {
        htlcTokenAccount: htlcTokenAccount,
        htlcKey: htlc,
        htlcBump,
        phtlcTokenAccount: phtlcTokenAccount,
        phtlcKey: phtlc,
        phtlcBump,
        commitCounter,
        lockIdStruct,
    };
}