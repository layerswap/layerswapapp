import { CommitmentParams, GetCommitsParams, LockParams } from "../phtlc";
import { Address } from "@ton/ton"
import tonClient from "./client";
import { hexToBigInt } from "viem";
import { beginCell, TupleBuilder } from "@ton/core"
import { NetworkWithTokens } from "../../../Models/Network";
import { AssetLock, Commit } from "../../../Models/PHTLC";


export const getTONLock = async (params: LockParams & { network: NetworkWithTokens | undefined }) => {

    const {
        lockId,
        contractAddress,
        network
    } = params

    if (!network) throw Error("No network found")

    const bigIntValue = hexToBigInt(lockId as `0x${string}`);

    let args = new TupleBuilder();
    args.writeNumber(bigIntValue);

    const lockDetailsResult = await tonClient.runMethod(
        Address.parse(contractAddress),
        "getLockCDetails",
        args.build()
    );
    const lockDetails = (lockDetailsResult?.stack as any)?.items?.[0]?.items

    if(!lockDetails) return null

    const srcLockAsset = lockDetails[3].beginParse().loadStringTail()
    const lockSender = lockDetails[4].beginParse().loadAddress().toString()

    const lockAmount = Number(lockDetails[8]) / Math.pow(10, network.tokens.find(t => t.symbol === srcLockAsset)?.decimals || 8)

    const parsedLockResult: AssetLock = {
        dstAddress: lockDetails[0].beginParse().loadStringTail(),
        dstChain: lockDetails[1].beginParse().loadStringTail(),
        dstAsset: lockDetails[2].beginParse().loadStringTail(),
        srcAsset: srcLockAsset,
        sender: lockSender,
        srcReceiver: lockDetails[5].beginParse().loadAddress().toString(),
        hashlock: lockId,
        secret: Number(lockDetails[7]),
        amount: lockAmount,
        timelock: Number(lockDetails[9]),
        redeemed: Number(lockDetails[10]) == 1,
        unlocked: Number(lockDetails[11]) == 1
    }

    return parsedLockResult
}

export const getTONCommitment = async (params: CommitmentParams & { hashlock: string | undefined, network: NetworkWithTokens | undefined }) => {

    const {
        commitId,
        contractAddress,
        hashlock,
        network
    } = params

    if (!network) throw Error("No network found")

    const bigIntValue = hexToBigInt(commitId as `0x${string}`);

    let args = new TupleBuilder();
    args.writeNumber(bigIntValue);

    const commitResult = await tonClient.runMethod(
        Address.parse(contractAddress),
        "getCommitDetails",
        args.build()
    );

    const commitDetails = (commitResult.stack as any)?.items?.[0]?.items

    if (!commitDetails) return null

    const details = commitDetails;
    const locked = Number(details[10]) === 1
    const srcAsset = details[3].beginParse().loadStringTail()
    const sender = details[4].beginParse().loadAddress().toString()

    const token = network?.tokens.find(t => t.symbol === srcAsset)
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
        lockId: hashlock,
        uncommitted: Number(details[11]) === 1,
    }

    return parsedResult
}

export const getTONCommits = async (params: GetCommitsParams & { address: string }) => {
    const { address, contractAddress } = params
    let args = new TupleBuilder();
    args.writeSlice(beginCell().storeAddress(Address.parse(address)).endCell());

    const commitsResponse = await tonClient.runMethod(
        Address.parse(contractAddress),
        "getCommits",
        args.build()
    );

    const commits = (commitsResponse.stack as any)?.items?.[0]?.type !== 'null' ? (commitsResponse.stack as any).items : null

    if (!commits) return []

    debugger
    const parsedCommits = commits?.map((commit: any) => {
        debugger
        commit.cell.beginParse().loadStringTail();
        commit.cell.beginParse().loadAddress().toString()
    })


}