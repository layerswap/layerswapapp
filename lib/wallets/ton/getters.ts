import { CommitmentParams } from "../phtlc";
import { Address } from "@ton/ton"
import tonClient from "./client";
import { hexToBigInt, toHex } from "viem";
import { TupleBuilder } from "@ton/core"
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
    const hashlock = (Number(details[8]) != 0) ? toHex(details[8]) : undefined

    const parsedResult: Commit = {
        sender,
        srcReceiver: details[6].beginParse().loadAddress().toString(),
        timelock: Number(details[10]),
        amount,
        hashlock,
        id,
        secret: Number(details[7]),
        claimed: Number(details[12]) === 1 ? 2 : Number(details[11]) === 1 ? 3 : 1
    }

    return parsedResult
}