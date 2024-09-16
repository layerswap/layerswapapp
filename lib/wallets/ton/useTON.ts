import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import KnownInternalNames from "../../knownIds";
import { Wallet } from "../../../stores/walletStore";
import { WalletProvider } from "../../../hooks/useWallet";
import TON from "../../../components/icons/Wallets/TON";
import { useEffect, useState } from "react";
import { CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../phtlc";
import { Address, beginCell, Cell, toNano } from "@ton/ton"
import { commitTransactionBuilder } from "./transactionBuilder";
import { AssetLock, Commit } from "../../../Models/PHTLC";
import tonClient from "./client";
import { hexToBigInt, toHex } from "viem";
import { TupleBuilder } from "@ton/core"
import { useSettingsState } from "../../../context/settings";
import { retryUntilFecth } from "../../retry";
import { getTONCommitment, getTONLock } from "./getters";

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
        const network = networks.find(n => n.chain_id === params.chainId)

        try {

            var search = window.location.search.substring(1);
            const searchData = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}')
            const hashlock = searchData.hashlock as string | undefined

            const commitDetailsResult = await getTONCommitment({ network, hashlock, ...params })

            const lockDetailsResult = (!commitDetailsResult && hashlock) ? await getTONLock({ lockId: hashlock, network, ...params }) : null

            const parsedResult: Commit = commitDetailsResult || {
                dstAddress: lockDetailsResult?.dstAddress || '',
                dstChain: lockDetailsResult?.dstChain || '',
                dstAsset: lockDetailsResult?.dstAsset || '',
                srcAsset: lockDetailsResult?.srcAsset || '',
                sender: lockDetailsResult?.sender || '',
                srcReceiver: lockDetailsResult?.srcReceiver || '',
                lockId: lockDetailsResult?.hashlock || '',
                amount: lockDetailsResult?.amount || 0,
                timelock: lockDetailsResult?.timelock || 0,
                locked: true,
                uncommitted: false,
                messenger: ''
            }

            if (!(commitDetailsResult || lockDetailsResult)) {
                throw new Error("No result")
            }
            return parsedResult
        }
        catch (e) {
            console.log(e)
            throw new Error("No result")
        }

    }

    const getLockIdByCommitId = async (params: CommitmentParams) => {
        const { commitId, contractAddress } = params

        const bigIntValue = hexToBigInt(commitId as `0x${string}`);

        let args = new TupleBuilder();
        args.writeNumber(bigIntValue);

        const lockIdResult = await tonClient.runMethod(
            Address.parse(contractAddress),
            "getLockIdByCommitId",
            args.build()
        );

        const lockId = (lockIdResult?.stack as any)?.items?.[0]?.value as bigint

        if (!lockId) return null

        return toHex(lockId)
    }

    const lockCommitment = async (params: CommitmentParams & LockParams) => {
        const { commitId, contractAddress, lockId } = params

        const LOCK_TIME = 1000 * 60 * 15 // 15 minutes
        const timeLockMS = Date.now() + LOCK_TIME
        const timelock = BigInt(Math.floor(timeLockMS / 1000))

        const body = beginCell()
            .storeUint(1558004185, 32)
            .storeInt(hexToBigInt(commitId as `0x${string}`), 257)
            .storeInt(hexToBigInt(lockId as `0x${string}`), 257)
            .storeInt(timelock, 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.1').toString(),
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

    const getLock = async (params: LockParams): Promise<AssetLock | undefined> => {

        const network = networks.find(n => n.chain_id === params.chainId)
        const lockDetailsResult = await getTONLock({ network, ...params })

        if (!lockDetailsResult) return undefined

        return lockDetailsResult
    }

    const refund = async (params: RefundParams) => {
        const { lockId, commit, commitId, contractAddress } = params

        if (commit.locked && !lockId) {
            throw new Error("No lockId")
        }

        const id = lockId || commitId
        const opcode = lockId ? 2910985977 : 2841160739

        const body = beginCell()
            .storeUint(opcode, 32)
            .storeInt(hexToBigInt(id as `0x${string}`), 257)
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: contractAddress,
                    amount: toNano('0.1').toString(),
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