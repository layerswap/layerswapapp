import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { CommitmentParams, CreatyePreHTLCParams, LockParams, RefundParams } from "../phtlc"
import { AnchorHtlc } from "./anchorHTLC"
import { AssetLock, Commit } from "../../../Models/PHTLC"
import { Address, AnchorProvider, BN, Program, setProvider } from '@coral-xyz/anchor'
import { PublicKey, Transaction } from "@solana/web3.js"
import { useSettingsState } from "../../../context/settings"

export default function useSolana(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet]
    const name = 'solana'
    const { publicKey, disconnect, wallet, signTransaction } = useWallet();
    const { setVisible } = useWalletModal();
    const { connection } = useConnection();
    const anchorWallet = useAnchorWallet();
    const { networks } = useSettingsState()

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


    const createPreHTLC = async (params: CreatyePreHTLCParams): Promise<{ hash: `0x${string}`; commitId: string; } | null> => {
        const { destinationChain, destinationAsset, sourceAsset, lpAddress, address, amount, atomicContract, chainId } = params

        if (!program || !sourceAsset.contract || !publicKey) return null

        let [commitCounter, _] = PublicKey.findProgramAddressSync(
            [Buffer.from("commitCounter")],
            program.programId
        );
        let [phtlcTokenAccount] = commitCounter && PublicKey.findProgramAddressSync(
            [Buffer.from("phtlc_token_account"), commitCounter.toBuffer()],
            program.programId
        );
        let [phtlc, phtlcBump] = commitCounter && PublicKey.findProgramAddressSync(
            [commitCounter.toBuffer()],
            program.programId
        );
        let [commits] = PublicKey.findProgramAddressSync(
            [Buffer.from("commits"), publicKey.toBuffer()],
            program.programId
        );
        const hopChains = [destinationChain]
        const hopAssets = [destinationAsset]
        const hopAddresses = [lpAddress]

        const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;

        const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contract), publicKey);

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

        const initCommitTx = await program.methods.initCommits().
            accountsPartial({
                sender: publicKey,
                commits: commits,
            })
            .transaction();

        const commitTx = await program.methods
            .commit(commitCounterArray, hopChains, hopAssets, hopAddresses, destinationChain, destinationAsset, address, sourceAsset.symbol, new PublicKey(lpAddress), TIMELOCK, publicKey, new BN(amount), phtlcBump)
            .accountsPartial({
                sender: publicKey,
                phtlc: phtlc,
                phtlc_token_account: phtlcTokenAccount,
                commitCounter: commitCounter,
                commits: commits,
                token_contract: sourceAsset.contract,
                sender_token_account: senderTokenAddress
            })
            .transaction();

        let initAndCommit = new Transaction();
        initAndCommit.add(initCommitTx);
        initAndCommit.add(commitTx);


        const signed = signTransaction && await signTransaction(initAndCommit);
        const signature = signed && await connection.sendRawTransaction(signed.serialize());

        const blockHash = await connection.getLatestBlockhash();

        const res = signature && await connection.confirmTransaction({
            blockhash: blockHash.blockhash,
            lastValidBlockHeight: blockHash.lastValidBlockHeight,
            signature
        });

        return res as any

    }

    const getCommitment = async (params: CommitmentParams): Promise<Commit> => {

        const { commitId } = params
        const commitIdBuffer = Buffer.from(commitId.replace('0x', ''), 'hex');

        let [phtlc, phtlcBump]: any = program && commitIdBuffer && PublicKey.findProgramAddressSync(
            [commitIdBuffer],
            program.programId
        );
        const result = await program?.methods.getCommitDetails(Array.from(commitIdBuffer), phtlcBump).accountsPartial({ phtlc }).view();

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
            let [lockIdStruct, _b] = commitIdBuffer && PublicKey.findProgramAddressSync(
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
        const { commitId, lockId, chainId, lockData } = params

        const network = networks.find(n => n.chain_id === chainId)
        const token = network?.tokens.find(t => t.symbol === lockData?.dstAsset)

        if (!program || !token?.contract || !publicKey) return null

        const TIME = new Date().getTime();
        const TIMELOC = (TIME + 4500) / 1000;
        const TIMELOCK = new BN(TIMELOC);

        const commitIdBuffer = Buffer.from(commitId);
        const lockIdBuffer = Buffer.from(lockId);
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
        const result = await program.methods.lockCommit(Array.from(commitIdBuffer), Array.from(lockIdBuffer), TIMELOCK, Number(htlcBump)).
            accountsPartial({
                messenger: publicKey,
                phtlc: phtlc,
                htlc: htlc,
                phtlc_token_account: phtlcTokenAccount,
                htlc_token_account: htlcTokenAccount,
                token_contract: new PublicKey(token.contract),
            }).rpc();

        return { hash: `0x${toHexString(result)}` as `0x${string}`, result: result } as any
    }

    const getLock = async (params: LockParams): Promise<AssetLock> => {
        const { lockId } = params
        const lockIdBuffer = Buffer.from(lockId.replace('0x', ''), 'hex');

        let [htlc, htlcBump]: any = program && lockIdBuffer && PublicKey.findProgramAddressSync(
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

        if (!result) {
            throw new Error("No result")
        }
        return parsedResult
    }

    const refund = async (params: RefundParams) => {
        // if (!program) return null

        // const { lockId, commit, commitId } = params

        // const commitIdBuffer = Buffer.from(commitId);
        // const lockIdBuffer = lockId && Buffer.from(lockId);

        // let [htlc, htlcBump] = lockIdBuffer && PublicKey.findProgramAddressSync(
        //     [lockIdBuffer],
        //     program.programId
        // ) || [];
        // let [htlcTokenAccount, bump2] = lockIdBuffer && PublicKey.findProgramAddressSync(
        //     [Buffer.from("htlc_token_account"), lockIdBuffer],
        //     program.programId
        // ) || [];
        // let [phtlc, phtlcBump] = commitIdBuffer && PublicKey.findProgramAddressSync(
        //     [commitIdBuffer],
        //     program.programId
        // );
        // let [phtlcTokenAccount, bump3] = commitIdBuffer && PublicKey.findProgramAddressSync(
        //     [Buffer.from("phtlc_token_account"), commitIdBuffer],
        //     program.programId
        // );
        // if (commit.locked && !lockId) {
        //     throw new Error("No lockId")
        // }

        // if (commit.locked && lockId) {
        //     const lockIdBuffer = Buffer.from(lockId);
        //     const result = await program.methods.unlock(Array.from(lockIdBuffer), Number(htlcBump)).accountsPartial({
        //         userSigning: '',
        //         htlc: htlc,
        //         htlcTokenAccount: htlcTokenAccount,
        //         sender: '',
        //         tokenContract: '',
        //         senderTokenAccount: '',
        //     }).rpc();
        //     return { result: result }
        // } else {
        //     const commitIdBuffer = Buffer.from(commitId);
        //     const result = await program.methods.uncommit(Array.from(commitIdBuffer), Number(htlcBump)).accountsPartial({
        //         userSigning: '',
        //         phtlc: phtlc,
        //         phtlcTokenAccount: phtlcTokenAccount,
        //         sender: '',
        //         tokenContract: '',
        //         senderTokenAccount: '',
        //     }).rpc();
        //     return { result: result }
        // }

        throw new Error('Not implemented')
    }

    const getCommits = async () => {
        if (!program || !publicKey) return null
        let [commits] = PublicKey.findProgramAddressSync(
            [Buffer.from("commits"), publicKey.toBuffer()],
            program.programId
        );

        const res = await program.methods.getCommits(publicKey).accountsPartial({ commits: commits }).view();

        return res
    }

    const claim = () => {
        throw new Error('Not implemented')
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
        refund,

        claim,
        getCommits
    }
}


function toHexString(byteArray) {
    return Array.from(byteArray, function (byte: any) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}