import { Address, JettonMaster, beginCell, toNano } from '@ton/ton'
import { Token } from '@layerswap/widget/types';
import { createTonClient } from '../client';

export const transactionBuilder = async (amount: number, token: Token, depositAddress: string, sourceAddress: string, callData: string, apiKey?: string) => {
    const parsedCallData = JSON.parse(callData)

    if (token.contract) {
        const destinationAddress = Address.parse(depositAddress);
        const userAddress = Address.parse(sourceAddress)

        const forwardPayload = beginCell()
            .storeUint(0, 32) // 0 opcode means we have a comment
            .storeStringTail(parsedCallData.comment)
            .endCell();

        const body = beginCell()
            .storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
            .storeUint(0, 64) // query id
            .storeCoins(parsedCallData.amount) // jetton amount
            .storeAddress(destinationAddress) // TON wallet destination address
            .storeAddress(destinationAddress) // response excess destination
            .storeBit(0) // no custom payload
            .storeCoins(toNano('0.00002')) // forward amount (if >0, will send notification message)
            .storeBit(1) // we store forwardPayload as a reference
            .storeRef(forwardPayload)
            .endCell();

        const tonClient = createTonClient(apiKey)
        const jettonMasterAddress = Address.parse(token.contract!)
        const jettonMaster = tonClient.open(JettonMaster.create(jettonMasterAddress))
        const jettonAddress = await jettonMaster.getWalletAddress(userAddress)

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: jettonAddress.toString(), // sender jetton wallet
                    amount: toNano('0.045').toString(), // for commission fees, excess will be returned
                    payload: body.toBoc().toString("base64") // payload with jetton transfer and comment body
                }
            ]
        }
        return tx
    } else {
        const body = beginCell()
            .storeUint(0, 32) // write 32 zero bits to indicate that a text comment will follow
            .storeStringTail(parsedCallData.comment) // write our text comment
            .endCell();

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [
                {
                    address: depositAddress,
                    amount: toNano(amount).toString(),
                    payload: body.toBoc().toString("base64") // payload with comment in body
                }
            ]
        }
        return tx
    }
}