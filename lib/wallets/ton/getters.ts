import { CommitmentParams, GetCommitsParams } from "../phtlc";
import { Address } from "@ton/ton"
import tonClient from "./client";
import { hexToBigInt } from "viem";
import { beginCell, TupleBuilder } from "@ton/core"
import { NetworkWithTokens } from "../../../Models/Network";
import { Commit } from "../../../Models/PHTLC";


export const getTONDetails = async (params: CommitmentParams & { network: NetworkWithTokens | undefined }) => {

    const {
        id,
        contractAddress,
        network
    } = params

    if (!network) throw Error("No network found")

    const bigIntValue = hexToBigInt(id as `0x${string}`);

    let args = new TupleBuilder();
    args.writeNumber(bigIntValue);

    const commitResult = await tonClient.runMethod(
        Address.parse(contractAddress),
        "getDetails",
        args.build()
    );

    const commitDetails = (commitResult.stack as any)?.items?.[0]?.items

    if (!commitDetails) return null

    const details = commitDetails;
    const srcAsset = details[3].beginParse().loadStringTail()
    const sender = details[4].beginParse().loadAddress().toString()

    const token = network?.tokens.find(t => t.symbol === srcAsset)
    const amount = Number(details[9]) / Math.pow(10, token?.decimals || 8)
    const hashlock = details[8].toString()

    const parsedResult: Commit = {
        dstAddress: details[0].beginParse().loadStringTail(),
        dstChain: details[1].beginParse().loadStringTail(),
        dstAsset: details[2].beginParse().loadStringTail(),
        srcAsset,
        sender,
        srcReceiver: details[6].beginParse().loadAddress().toString(),
        timelock: Number(details[10]),
        amount,
        hashlock: hashlock != 0 && hashlock,
        id,
        refunded: Number(details[12]) === 1,
        secret: Number(details[7]),
        redeemed: Number(details[11]) === 1
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

    const parsedCommits = commits?.map((commit: any) => {
        debugger
        commit.cell.beginParse().loadStringTail();
        commit.cell.beginParse().loadAddress().toString()
    })


}