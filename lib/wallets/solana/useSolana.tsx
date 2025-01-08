import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { WalletProvider } from "../../../hooks/useWallet"
import KnownInternalNames from "../../knownIds"
import { AnchorWallet, useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import resolveWalletConnectorIcon from "../utils/resolveWalletIcon"
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../phtlc"
import { AnchorHtlc } from "./anchorHTLC"
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor'
import { PublicKey } from "@solana/web3.js"
import { useSettingsState } from "../../../context/settings"
import { NetworkType, Token } from "../../../Models/Network"
import { useCallback } from "react"
import { lockTransactionBuilder, phtlcTransactionBuilder } from "./transactionBuilder"

export default function useSolana(): WalletProvider {
    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet]
    const name = 'solana'
    const { publicKey, disconnect, wallet, signTransaction } = useWallet();
    const { setVisible } = useWalletModal();
    const { connection } = useConnection();
    const anchorWallet = useAnchorWallet();
    const { networks } = useSettingsState()
    const solana = networks.find(n => n.type === NetworkType.Solana)

    const provider = anchorWallet && new AnchorProvider(connection, anchorWallet);
    if (provider) setProvider(provider);

    const program = (provider && solana?.metadata?.htlc_token_contract) ? new Program(AnchorHtlc(solana?.metadata?.htlc_token_contract), provider) : null;

    const getWallet = () => {
        if (publicKey) {
            const address = publicKey?.toBase58()
            return {
                address: address,
                connector: wallet?.adapter?.name,
                providerName: name,
                chainId: solana?.chain_id,
                icon: resolveWalletConnectorIcon({ connector: String(wallet?.adapter.name), address: address })
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

    const createPreHTLC = useCallback(async (params: CreatePreHTLCParams): Promise<{ hash: string; commitId: string; } | null | undefined> => {
        if (!program || !publicKey || !solana) return null

        const transaction = await phtlcTransactionBuilder({ connection, program, walletPublicKey: publicKey, network: solana, ...params })

        const signed = transaction?.initAndCommit && signTransaction && await signTransaction(transaction.initAndCommit);
        const signature = signed && await connection.sendRawTransaction(signed.serialize());

        if (signature) {
            const blockHash = await connection.getLatestBlockhash();

            const res = await connection.confirmTransaction({
                blockhash: blockHash.blockhash,
                lastValidBlockHeight: blockHash.lastValidBlockHeight,
                signature
            });

            if (res?.value.err) {
                throw new Error(res.value.err.toString())
            }

            return { hash: signature, commitId: `0x${toHexString(transaction.commitId)}` }
        }

    }, [program, connection, signTransaction, publicKey, solana])

    const getDetails = async (params: CommitmentParams) => {

        if (!solana?.metadata.lp_address) throw new Error("No LP address")

        const { id } = params
        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');

        const lpAnchorWallet = { publicKey: new PublicKey(solana?.metadata?.lp_address) }
        const provider = new AnchorProvider(connection, lpAnchorWallet as AnchorWallet);
        const lpProgram = (provider && solana?.metadata?.htlc_token_contract) ? new Program(AnchorHtlc(solana?.metadata?.htlc_token_contract), provider) : null;

        if (!lpProgram) {
            throw new Error("Could not initiatea program")
        }

        let [htlc] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            lpProgram.programId
        );

        try {
            const result = await lpProgram?.methods.getDetails(Array.from(idBuffer)).accountsPartial({ htlc }).view();

            if (!result) return null

            const parsedResult = {
                ...result,
                hashlock: (result?.hashlock && toHexString(result.hashlock) !== '0000000000000000000000000000000000000000000000000000000000000000') && `0x${toHexString(result.hashlock)}`,
                amount: Number(result.amount) / Math.pow(10, 6),
                timelock: Number(result.timelock),
                sender: new PublicKey(result.sender).toString(),
                srcReceiver: new PublicKey(result.srcReceiver).toString(),
                secret: result.secret,
                tokenContract: new PublicKey(result.tokenContract).toString(),
                tokenWallet: new PublicKey(result.tokenWallet).toString(),
            }

            return parsedResult
        }
        catch (e) {
            console.log(e)
            throw new Error("No result")
        }
    }

    const addLock = async (params: CommitmentParams & LockParams & { destinationAsset: Token }) => {

        if (!program || !publicKey) return null

        const transaction = await lockTransactionBuilder({ connection, program, walletPublicKey: publicKey, ...params })

        const signed = transaction?.lockCommit && signTransaction && await signTransaction(transaction.lockCommit);
        const signature = signed && await connection.sendRawTransaction(signed.serialize());


        if (signature) {
            const blockHash = await connection.getLatestBlockhash();

            const res = await connection.confirmTransaction({
                blockhash: blockHash.blockhash,
                lastValidBlockHeight: blockHash.lastValidBlockHeight,
                signature
            });

            if (res?.value.err) {
                throw new Error(res.value.err.toString())
            }

            return { hash: signature, result: `0x${toHexString(transaction.lockId)}` }

        } else {
            return null
        }
    }

    const refund = async (params: RefundParams) => {
        const { id, sourceAsset } = params

        if (!program || !sourceAsset?.contract || !publicKey) return null

        const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;
        const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contract), publicKey);
        const tokenContract = new PublicKey(sourceAsset.contract);

        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');

        let [htlc, htlcBump] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            program.programId
        );
        let [htlcTokenAccount, bump3] = idBuffer && PublicKey.findProgramAddressSync(
            [Buffer.from("htlc_token_account"), idBuffer],
            program.programId
        );

        const result = await program.methods.refund(Array.from(idBuffer), Number(htlcBump)).accountsPartial({
            userSigning: publicKey,
            htlc,
            htlcTokenAccount,
            sender: publicKey,
            tokenContract: tokenContract,
            senderTokenAccount: senderTokenAddress,
        }).rpc();

        return { result: result }
    }

    const claim = async (params: ClaimParams) => {
        const { sourceAsset, id, secret } = params

        if (!program || !sourceAsset?.contract || !publicKey) return

        const tokenContract = new PublicKey(sourceAsset.contract);
        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');
        const secretBuffer = Buffer.from(secret.toString().replace('0x', ''), 'hex');
        const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;
        const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contract), publicKey);

        let [htlc, htlcBump] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            program.programId
        );
        let [htlcTokenAccount, bump3] = idBuffer && PublicKey.findProgramAddressSync(
            [Buffer.from("htlc_token_account"), idBuffer],
            program.programId
        );

        await program.methods.redeem(idBuffer, secretBuffer, htlcBump).
            accountsPartial({
                userSigning: publicKey,
                htlc: htlc,
                htlcTokenAccount: htlcTokenAccount,
                sender: publicKey,
                tokenContract: tokenContract,
                srcReceiverTokenAccount: senderTokenAddress,
            })
            .rpc();
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
        getDetails,
        addLock,
        refund,
        claim,
    }
}


function toHexString(byteArray) {
    return Array.from(byteArray, function (byte: any) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}