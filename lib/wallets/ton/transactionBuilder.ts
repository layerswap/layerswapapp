import { retryWithExponentialBackoff } from "../../retry";
import { CreatePreHTLCParams } from "../phtlc";
import tonClient from "./client";
import { JettonMaster, Address, Builder, Dictionary, DictionaryValue, beginCell, Slice, Cell, toNano } from "@ton/ton"
import { fromHex } from "viem";

export const commitTransactionBuilder = async (params: CreatePreHTLCParams & { wallet: { address: string, publicKey: string } }) => {

    const {
        wallet,
        lpAddress,
        atomicContract,
        sourceAsset,
        destinationChain,
        destinationAsset,
        address,
        decimals,
        amount
    } = params

    if (!sourceAsset.contract) return

    const response_destination = Address.parse(wallet.address);

    const queryId = BigInt(Date.now());

    const hopChains = createStrMap([
        [0n, { $$type: 'StringImpl', data: "ARBITRUM_SEPOLIA" }]
    ]);

    const hopAssets = createStrMap([
        [0n, { $$type: 'StringImpl', data: "USDC" }]
    ]);

    const hopAddresses = createStrMap([
        [0n, { $$type: 'StringImpl', data: "0xF6517026847B4c166AAA176fe0C5baD1A245778D" }]
    ]);

    const LOCK_TIME = 1000 * 60 * 15 // 15 minutes
    const timeLockMS = Date.now() + LOCK_TIME
    const timelock = BigInt(Math.floor(timeLockMS / 1000))

    const senderPublicKey = fromHex(`0x${wallet.publicKey}`, 'bigint')
    const srcReceiver: Address = Address.parse(lpAddress);
    const parsedAtomicContract = Address.parse(atomicContract);

    const userAddress = Address.parse(wallet.address)

    const jettonMasterAddress = Address.parse(sourceAsset.contract)
    const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress))
    const getJettonAddress = async (address: Address) => {
        return await jettonMaster.getWalletAddress(address)
    }

    const htlcJettonWalletAddress = await retryWithExponentialBackoff(async () => await getJettonAddress(parsedAtomicContract))

    let b_0 = new Builder();
    b_0.storeStringRefTail(destinationChain);
    b_0.storeStringRefTail(destinationAsset);
    let b_1 = new Builder();
    b_1.storeStringRefTail(address);
    b_1.storeStringRefTail(sourceAsset.symbol);
    b_1.storeAddress(srcReceiver);
    b_1.storeInt(timelock, 257);
    b_1.storeAddress(jettonMasterAddress);
    let b_2 = new Builder();
    b_2.storeAddress(htlcJettonWalletAddress);
    b_2.storeInt(senderPublicKey, 257);
    b_2.storeDict(hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
    b_2.storeDict(hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
    b_2.storeDict(hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
    b_1.storeRef(b_2.endCell());
    b_0.storeRef(b_1.endCell());

    const forward_payload = beginCell().storeUint(1, 1).storeRef(beginCell().storeUint(1734998782, 32).storeBuilder(b_0).endCell()).endCell();
    const custom_payload: Cell | null = beginCell().storeInt(0, 32).storeStringTail("Success").endCell();
    const tokenTransferAmount = BigInt(Number(amount) * Math.pow(10, decimals))

    const body = beginCell()
        .storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
        .storeUint(queryId, 64) // query id
        .storeCoins(tokenTransferAmount) // jetton amount
        .storeAddress(parsedAtomicContract) // TON wallet destination address
        .storeAddress(response_destination) // response excess destination
        .storeBit(1)
        .storeRef(custom_payload)// no custom payload
        .storeCoins(toNano('0.1')) // forward amount (if >0, will send notification message)
        .storeBuilder(forward_payload.asBuilder()) // we store forwardPayload as a reference
        .endCell();

    const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
            {
                address: (await getJettonAddress(userAddress)).toString(), // sender jetton wallet
                amount: toNano('0.2').toString(), // for commission fees, excess will be returned
                payload: body.toBoc().toString("base64") // payload with jetton transfer and comment body
            }
        ]
    }

    return tx

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