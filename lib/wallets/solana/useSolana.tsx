import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { CommitmentParams, CreatyePreHTLCParams, LockParams, RefundParams } from "../phtlc"
import { AnchorHtlc } from "./anchorHTLC"
import { AssetLock, Commit } from "../../../Models/PHTLC"
import { Address, AnchorProvider, BN, Program, setProvider, web3 } from '@coral-xyz/anchor'
import { randomBytes } from "crypto"
import { PublicKey } from "@solana/web3.js"

export default function useSolana(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet]
    const name = 'solana'
    const { publicKey, disconnect, wallet } = useWallet();
    const { setVisible } = useWalletModal();
    const { connection } = useConnection();
    const anchorWallet = useAnchorWallet();

    const provider = anchorWallet && new AnchorProvider(connection, anchorWallet, {});
    if (provider) setProvider(provider);

    const program = provider && new Program(AnchorHtlc, provider);

    const getWallet = () => {
        if (publicKey) {
            return {
                address: publicKey?.toBase58(),
                connector: wallet?.adapter?.name,
                providerName: name,
                chainId: 'mainnet',
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

        let [commitCounter, _] = await web3.PublicKey.findProgramAddressSync(
            [Buffer.from("commitCounter")],
            program.programId
        );
        let [phtlcTokenAccount, bump3] = commitCounter && await web3.PublicKey.findProgramAddressSync(
            [Buffer.from("phtlc_token_account"), commitCounter.toBuffer()],
            program.programId
        );
        let [phtlc, phtlcBump] = commitCounter && await web3.PublicKey.findProgramAddressSync(
            [commitCounter.toBuffer()],
            program.programId
        );
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

        const TIME = new Date().getTime();
        const TIMELOC = (TIME + 4500) / 1000;
        const TIMELOCK = new BN(TIMELOC);
        const commitCounterArray = Array.from(new Uint8Array(commitCounter.toBuffer()));

        const tx1 = await program.methods
            .commit(commitCounterArray, hopChains, hopAssets, hopAddresses, destinationChain, destinationAsset, address, sourceAsset.symbol, publicKey, TIMELOCK, publicKey, new BN(amount), phtlcBump)
            .accountsPartial({
                sender: publicKey,
                phtlc: phtlc,
                phtlcTokenAccount: phtlcTokenAccount,
                commitCounter: commitCounter,
                senderTokenAccount: publicKey
            })
            .rpc();

        return tx1

    }

    const getCommitment = async (params: CommitmentParams): Promise<Commit> => {

        const { chainId, commitId, contractAddress, type } = params
        const commitIdBuffer = Buffer.from(commitId, 'hex', 32);

        let [htlc, htlcBump] = lockId && await web3.PublicKey.findProgramAddressSync(
            [lockId],
            program.programId
        );
        const result = await program.methods.getCommitDetails(Array.from(commitIdBuffer), htlcBump).accountsPartial({ phtlc: commitId }).view();

        if (!result) {
            throw new Error("No result")
        }
        return result as Commit
    }

    const getLockIdByCommitId = async (params: CommitmentParams) => {
        const { commitId } = params
        const commitIdBuffer = Buffer.from(commitId.replace('0x', ''), 'hex');
        if (!program) return null

        try {
            let [lockIdStruct, _b] = commitIdBuffer && await web3.PublicKey.findProgramAddressSync(
                [Buffer.from("commit_to_lock"), commitIdBuffer],
                program.programId
            );

            const result = await program.methods.getLockIdByCommitId(Array.from(commitIdBuffer)).accountsPartial({ lockIdStruct: lockIdStruct as Address }).view();
            if (!result) return null

            const parsedResult = `0x${toHexString(result)}`

            return parsedResult
        } catch (e) {
            console.log(e)
            return null
        }
    }

    const lockCommitment = async (params: CommitmentParams & LockParams) => {
        const { chainId, commitId, contractAddress, lockId, type } = params

        const TIME = new Date().getTime();
        const TIMELOC = (TIME + 4500) / 1000;
        const TIMELOCK = new BN(TIMELOC);

        const commitIdBuffer = Buffer.from(commitId);
        const lockIdBuffer = Buffer.from(lockId);
        let [htlc, htlcBump] = lockId && await web3.PublicKey.findProgramAddressSync(
            [lockIdBuffer],
            program.programId
        );
        let [phtlc, phtlcBump] = commitId && await web3.PublicKey.findProgramAddressSync(
            [commitIdBuffer],
            program.programId
        );
        let [htlcTokenAccount, bump2] = lockId && await web3.PublicKey.findProgramAddressSync(
            [Buffer.from("htlc_token_account"), lockIdBuffer],
            program.programId
        );
        let [phtlcTokenAccount, bump3] = commitId && await web3.PublicKey.findProgramAddressSync(
            [Buffer.from("phtlc_token_account"), commitIdBuffer],
            program.programId
        );
        const result = await program.methods.lockCommit(Array.from(commitIdBuffer), Array.from(lockIdBuffer), TIMELOCK, Number(htlcBump)).
            accountsPartial({
                messenger: publicKey,
                phtlc: phtlc,
                htlc: htlc,
                phtlcTokenAccount: phtlcTokenAccount,
                htlcTokenAccount: htlcTokenAccount,
                tokenContract: tokenMint,
            }).rpc();

        return { result: result }
    }

    const getLock = async (params: LockParams): Promise<AssetLock> => {
        const { lockId } = params
        const lockIdBuffer = Buffer.from(lockId.replace('0x', ''), 'hex');

        let [htlc, htlcBump] = program && lockIdBuffer && await web3.PublicKey.findProgramAddressSync(
            [lockIdBuffer],
            program.programId
        );
        const result = await program?.methods.getLockDetails(Array.from(lockIdBuffer), Number(htlcBump)).accountsPartial({ htlc }).view();

        const parsedResult = {
            ...result,
            amount: Number(result.amount),
            hashlock: `0x${toHexString(result.hashlock)}`,
            timelock: Number(result.timelock),
            sender: new PublicKey(result.sender).toString(),
            srcReceiver: new PublicKey(result.srcReceiver).toString(),
            secret: new TextDecoder().decode(result.secret),
            tokenContract: new PublicKey(result.tokenContract).toString(),
            tokenWallet: new PublicKey(result.tokenWallet).toString(),
        }

        debugger
        if (!result) {
            throw new Error("No result")
        }
        return parsedResult
    }

    const refund = async (params: RefundParams) => {
        const { chainId, lockId, commit, commitId, contractAddress, type } = params

        const commitIdBuffer = Buffer.from(commitId);
        const lockIdBuffer = lockId && Buffer.from(lockId);

        let [htlc, htlcBump] = lockIdBuffer && await web3.PublicKey.findProgramAddressSync(
            [lockIdBuffer],
            program.programId
        ) || [];
        let [htlcTokenAccount, bump2] = lockIdBuffer && await web3.PublicKey.findProgramAddressSync(
            [Buffer.from("htlc_token_account"), lockIdBuffer],
            program.programId
        ) || [];
        let [phtlc, phtlcBump] = commitIdBuffer && await web3.PublicKey.findProgramAddressSync(
            [commitIdBuffer],
            program.programId
        );
        let [phtlcTokenAccount, bump3] = commitIdBuffer && await web3.PublicKey.findProgramAddressSync(
            [Buffer.from("phtlc_token_account"), commitIdBuffer],
            program.programId
        );
        if (commit.locked && !lockId) {
            throw new Error("No lockId")
        }

        if (commit.locked && lockId) {
            const lockIdBuffer = Buffer.from(lockId);
            const result = await program.methods.unlock(Array.from(lockIdBuffer), Number(htlcBump)).accountsPartial({
                userSigning: publicKey,
                htlc: htlc,
                htlcTokenAccount: htlcTokenAccount,
                sender: publicKey,
                tokenContract: tokenMint,
                senderTokenAccount: aliceWallet,
            }).rpc();
            return { result: result }
        } else {
            const commitIdBuffer = Buffer.from(commitId);
            const result = await program.methods.uncommit(Array.from(commitIdBuffer), Number(htlcBump)).accountsPartial({
                userSigning: publicKey,
                phtlc: phtlc,
                phtlcTokenAccount: phtlcTokenAccount,
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


function byteArrayToJson(byteArray) {
    let jsonString = Array.from(byteArray).map((byte: any) => String.fromCharCode(byte)).join('');
    return JSON.parse(jsonString);
}
function toHexString(byteArray) {
    return Array.from(byteArray, function (byte: any) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}