import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import KnownInternalNames from "../../knownIds";
import { Wallet } from "../../../stores/walletStore";
import { WalletProvider } from "../../../hooks/useWallet";
import TON from "../../../components/icons/Wallets/TON";
import { useEffect, useState } from "react";
import { CommitmentParams, CreatePreHTLCParams, LockParams } from "../phtlc";
import { Address, Builder, Dictionary, DictionaryValue, beginCell, Slice, Cell, TupleItem, toNano } from "@ton/ton"
import { commitTransactionBuilder } from "./transactionBuilder";
import { Commit } from "../../../Models/PHTLC";
import tonClient from "./client";

export default function useTON(): WalletProvider {

    const withdrawalSupportedNetworks = [KnownInternalNames.Networks.TONMainnet, KnownInternalNames.Networks.TONTestnet]
    const name = 'ton'
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const [shouldConnect, setShouldConnect] = useState(false)

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




        return { hash: messageHash, commitId: (result as string) }
    }

    const getCommitment = async (params: CommitmentParams): Promise<Commit> => {
        const { chainId, commitId, contractAddress, type, } = params

        const bigIntValue = BigInt(commitId);

        const stack: TupleItem[] = [
            { type: 'int', value: bigIntValue }
        ];

        const result = await tonClient.runMethod(
            Address.parse(contractAddress),
            "getCommitDetails",
            stack
        );
        const commitDetails = result.stack[0][1].elements;
        const locked = commitDetails[9].number.number

        const lockIdResult = locked && await tonClient.runMethod(
            Address.parse(contractAddress),
            "getLockIdByCommitId",
            stack
        );

        const parsedResult: Commit = {
            dstAddress: (Cell.fromBase64(commitDetails[0].slice.bytes)).asSlice().loadStringTail(),
            dstChain: (Cell.fromBase64(commitDetails[1].slice.bytes)).asSlice().loadStringTail(),
            dstAsset: (Cell.fromBase64(commitDetails[2].slice.bytes)).asSlice().loadStringTail(),
            srcAsset: (Cell.fromBase64(commitDetails[3].slice.bytes)).asSlice().loadStringTail(),
            sender: (Cell.fromBase64(commitDetails[4].slice.bytes)).asSlice().loadAddress().toString(),
            srcReceiver: (Cell.fromBase64(commitDetails[5].slice.bytes)).asSlice().loadAddress().toString(),
            timelock: commitDetails[6].number.number,
            amount: commitDetails[7].number.number,
            messenger: (Cell.fromBase64(commitDetails[8].slice.bytes)).asSlice().loadAddress().toString(),
            locked: locked,
            lockId: locked && lockIdResult.stack[0][1],
            uncommitted: commitDetails[10].number.number,
            // jettonMasterAddress: (Cell.fromBase64(commitDetails[11].slice.bytes)).asSlice().loadAddress(),
            // htlcJettonWalletAddress: (Cell.fromBase64(commitDetails[12].slice.bytes)).asSlice().loadAddress()
        }

        if (!result) {
            throw new Error("No result")
        }
        return parsedResult
    }

    const getLockIdByCommitId = async (params: CommitmentParams) => {
        const { chainId, commitId, contractAddress, type } = params

        const lockIdResult = locked && await tonClient.runMethod(
            Address.parse(contractAddress),
            "getLockIdByCommitId",
            stack
        );

        if (!result || result === '0x0000000000000000000000000000000000000000000000000000000000000000') return null

        return result as `0x${string}`
    }

    const lockCommitment = async (params: CommitmentParams & LockParams) => {
        const { chainId, commitId, contractAddress, lockId, type } = params

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
                    amount: toNano('0.2').toString(), // for commission fees, excess will be returned
                    payload: body.toBoc().toString("base64") // payload with jetton transfer and comment body
                }
            ]
        }

        const res = await tonConnectUI.sendTransaction(tx)
        const cell = Cell.fromBase64(res.boc)
        const buffer = cell.hash();
        const messageHash = buffer.toString('hex');

        return { hash: messageHash, result: result }
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
        lockCommitment
    }
}


type TokenTransfer = {
    $$type: 'TokenTransfer';
    queryId: bigint;
    amount: bigint;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell | null;
    forward_ton_amount: bigint;
    forward_payload: Cell;
}


function createStrMap(initialData: [bigint, StringImpl][]): Dictionary<bigint, StringImpl> {
    const dict = Dictionary.empty<bigint, StringImpl>();

    initialData.forEach(([key, value]) => {
        dict.set(key, value);
    });

    return dict;
}

type StringImpl = {
    $$type: 'StringImpl';
    data: string;
}

function dictValueParserStringImpl(): DictionaryValue<StringImpl> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStringImpl(src)).endCell());
        },
        parse: (src) => {
            return loadStringImpl(src.loadRef().beginParse());
        }
    }
}

function storeStringImpl(src: StringImpl) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeStringRefTail(src.data);
    };
}

function loadStringImpl(slice: Slice) {
    let sc_0 = slice;
    let _data = sc_0.loadStringRefTail();
    return { $$type: 'StringImpl' as const, data: _data };
}