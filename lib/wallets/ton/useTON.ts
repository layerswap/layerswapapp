import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import KnownInternalNames from "../../knownIds";
import { Wallet } from "../../../stores/walletStore";
import { WalletProvider } from "../../../hooks/useWallet";
import TON from "../../../components/icons/Wallets/TON";
import { useEffect, useState } from "react";
import { CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../phtlc";
import { Address, beginCell, Cell, TupleItem, toNano } from "@ton/ton"
import { commitTransactionBuilder } from "./transactionBuilder";
import { AssetLock, Commit } from "../../../Models/PHTLC";
import tonClient from "./client";
import { hexToBigInt } from "viem";
import { TupleBuilder } from "@ton/core"
import { useSettingsState } from "../../../context/settings";
import { retryUntilFecth } from "../../retry";

export default function useTON(): WalletProvider {

    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.TONMainnet, KnownInternalNames.Networks.TONTestnet]
    const name = 'ton'
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const [shouldConnect, setShouldConnect] = useState(false)
    const { networks } = useSettingsState()

    useEffect(() => {
        if (shouldConnect) {
            connectWallet()
            setShouldConnect(false)
        }
    }, [shouldConnect])

    const getWallet = () => {
        if (wallet) {
            const w: Wallet = {
                address: Address.parse(wallet.account.address).toString({ bounceable: false }),
                connector: 'TON',
                providerName: name,
                icon: TON,
                chainId: 'tontestnet'//TODO check if it is correct
            }
            return w
        }
    }

    const connectWallet = () => {
        return tonConnectUI.openModal()
    }

    const disconnectWallet = async () => {
        try {
            await tonConnectUI.disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const reconnectWallet = async () => {
        try {
            await disconnectWallet()
            setShouldConnect(true)
        }
        catch (e) {
            console.log(e)
        }
    }

    const createPreHTLC = async (params: CreatePreHTLCParams) => {

        if (!wallet?.account.publicKey) return

        const tx = await commitTransactionBuilder({
            wallet: {
                address: wallet.account.address,
                publicKey: wallet.account.publicKey
            },
            ...params
        })

        if (!tx) throw new Error('Transaction not created')

        const res = await tonConnectUI.sendTransaction(tx)

        const cell = Cell.fromBase64(res.boc)
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');

        const getCommitId = async () => {

            await new Promise((resolve) => setTimeout(resolve, 3000))
            const events: Events = await fetch(`https://testnet.toncenter.com/api/v3/events?msg_hash=${messageHash}`).then(res => res.json())

            if (events?.events.length > 0) {

                const transactionsArray = Object.values(events.events[0].transactions)
                const body = transactionsArray.find(t => t.out_msgs?.length > 0 && t.out_msgs[0]?.destination == null && t.out_msgs[0].opcode === '0xbf3d24d1')?.out_msgs?.[0]?.message_content?.body
                if (!body) throw new Error('No commitId')

                const slice = Cell.fromBase64(body).beginParse()
                if (slice.loadUint(32) !== 3208455377) { }
                const commitId = slice.loadIntBig(257);

                return '0x' + commitId.toString(16);
            } else {
                throw new Error('No events')
            }
        }

        const commitId = await retryUntilFecth(getCommitId)


        return { hash: messageHash, commitId }
    }

    const getCommitment = async (params: CommitmentParams): Promise<Commit> => {
        const { commitId, contractAddress, chainId } = params

        try {
            const bigIntValue = hexToBigInt(commitId as `0x${string}`);

            let args = new TupleBuilder();
            args.writeNumber(bigIntValue);

            const commitResult = await tonClient.runMethod(
                Address.parse(contractAddress),
                "getCommitDetails",
                args.build()
            );

            const commitDetails = (commitResult.stack as any)?.items?.[0]?.items

            const lockIdResult = !commitDetails && await tonClient.runMethod(
                Address.parse(contractAddress),
                "getLockIdByCommitId",
                args.build()
            );

            debugger

            const lockDetailsResult = await tonClient.runMethod(
                Address.parse(contractAddress),
                "getLockCDetails",
                args.build()
            );


            const details = commitDetails;
            const locked = Number(details[10]) === 1
            const srcAsset = details[3].beginParse().loadStringTail()
            const sender = details[4].beginParse().loadAddress().toString()

            const token = networks.find(n => n.chain_id === chainId)?.tokens.find(t => t.symbol === srcAsset)
            const amount = Number(details[8]) / Math.pow(10, token?.decimals || 8)

            const parsedResult: Commit = {
                dstAddress: details[0].beginParse().loadStringTail(),
                dstChain: details[1].beginParse().loadStringTail(),
                dstAsset: details[2].beginParse().loadStringTail(),
                srcAsset,
                sender,
                srcReceiver: details[6].beginParse().loadAddress().toString(),
                timelock: Number(details[7]),
                amount,
                messenger: details[9].beginParse().loadAddress().toString(),
                locked,
                lockId: lockIdResult ? lockIdResult.stack[0][1].number.number : null,
                uncommitted: Number(details[11]) === 1,
            }

            if (!details) {
                throw new Error("No result")
            }
            return parsedResult
        }
        catch (e) {
            debugger
            console.log(e)
            throw new Error("No result")
        }

    }

    const getLockIdByCommitId = async (params: CommitmentParams) => {
        const { commitId, contractAddress } = params

        const bigIntValue = BigInt(commitId);

        let args = new TupleBuilder();
        args.writeNumber(bigIntValue);

        const lockIdResult = await tonClient.runMethod(
            Address.parse(contractAddress),
            "getLockIdByCommitId",
            args.build()
        );

        const lockId = lockIdResult.stack[0][1]

        if (!lockId) return null

        return lockId as `0x${string}`
    }

    const lockCommitment = async (params: CommitmentParams & LockParams) => {
        const { commitId, contractAddress, lockId } = params

        const LOCK_TIME = 1000 * 60 * 15 // 15 minutes
        const timeLockMS = Date.now() + LOCK_TIME
        const timelock = BigInt(Math.floor(timeLockMS / 1000))

        const body = beginCell()
            .storeUint(1558004185, 32)
            .storeInt(BigInt(commitId), 257)
            .storeInt(BigInt(lockId), 257)
            .storeInt(timelock, 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.2').toString(),
                    payload: body.toBoc().toString("base64")
                }
            ]
        }

        const res = await tonConnectUI.sendTransaction(tx)
        const cell = Cell.fromBase64(res.boc)
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');

        return { hash: messageHash, result: res }
    }

    const getLock = async (params: LockParams): Promise<AssetLock> => {
        const { lockId, contractAddress } = params

        const bigIntValue = BigInt(lockId);


        let args = new TupleBuilder();
        args.writeNumber(bigIntValue);

        const lockDetailsResult = await tonClient.runMethod(
            Address.parse(contractAddress),
            "getLockDetails",
            args.build()
        );


        if (!lockDetailsResult) {
            throw new Error("No result")
        }

        const lockDetails = lockDetailsResult.stack[0][1].elements;

        const parsedResult: AssetLock = {
            dstAddress: (Cell.fromBase64(lockDetails[0].slice.bytes)).asSlice().loadStringTail(),
            dstChain: (Cell.fromBase64(lockDetails[1].slice.bytes)).asSlice().loadStringTail(),
            dstAsset: (Cell.fromBase64(lockDetails[2].slice.bytes)).asSlice().loadStringTail(),
            srcAsset: (Cell.fromBase64(lockDetails[3].slice.bytes)).asSlice().loadStringTail(),
            sender: (Cell.fromBase64(lockDetails[4].slice.bytes)).asSlice().loadAddress().toString(),
            srcReceiver: (Cell.fromBase64(lockDetails[5].slice.bytes)).asSlice().loadAddress().toString(),
            hashlock: lockDetails[6].number.number,
            secret: lockDetails[7].number.number,
            amount: lockDetails[8].number.number,
            timelock: lockDetails[9].number.number,
            redeemed: lockDetails[10].number.number,
            unlocked: lockDetails[11].number.number,
            // jettonMasterAddress: (Cell.fromBase64(lockDetails[12].slice.bytes)).asSlice().loadAddress().toString(),
            // htlcJettonWalletAddress: (Cell.fromBase64(lockDetails[13].slice.bytes)).asSlice().loadAddress().toString(),
        }

        return parsedResult
    }

    const refund = async (params: RefundParams) => {
        const { lockId, commit, commitId, contractAddress } = params

        if (commit.locked && !lockId) {
            throw new Error("No lockId")
        }

        const id = lockId || commitId

        const body = beginCell()
            .storeUint(2910985977, 32)
            .storeInt(BigInt(id), 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.2').toString(),
                    payload: body.toBoc().toString("base64")
                }
            ]
        }

        const result = await tonConnectUI.sendTransaction(tx)

        if (!result) {
            throw new Error("No result")
        }
        return result
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

        claim
    }
}

type Events = {
    events: {
        transactions: {
            [transaction: string]: {
                out_msgs: {
                    opcode: string
                    destination: string | null,
                    message_content: {
                        body: string,
                    },
                }[]
            }
        }
    }[]
}