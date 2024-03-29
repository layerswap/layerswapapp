import { BigNumber } from 'ethers';
import { jubjub } from './jubjub';
import { SignatureScheme } from './eddsa';

import * as ethUtil from 'ethereumjs-util'
import * as fm from './formatter'
import { bnToBufWithFixedLength } from './poseidon/eddsa';
import { field } from './field';
import { PoseidonParams, permunation } from './permutation';
import { EDDSAUtil } from './poseidon/EDDSAUtil';
import { 
    OriginTransferRequestV3,
    ChainId, 
    UpdateAccountRequestV3 
} from './defs';
import BN from 'bn.js';

import BigInteger from 'bignumber.js'
import * as crypto from 'crypto-js'
import { toBig, toHex } from './formatter';


const SNARK_SCALAR_FIELD = new BigInteger(
    '21888242871839275222246405745257275088548364400416034343698204186575808495617',
    10,
)

const generateKeyPair = (seed: any) => {
    let bigInt = BigNumber.from(0)
    for (let i = 0; i < seed.length; i++) {
        const item = seed[i]
        const itemBigInt = BigNumber.from(item)
        const tmp = BigNumber.from("256").pow(BigNumber.from(i))
        bigInt = bigInt.add(itemBigInt.mul(tmp))
    }

    const secretKey = bigInt.mod(jubjub.JUBJUB_L)

    const copySecretKey = BigNumber.from(secretKey.toString())

    const B = SignatureScheme.B()

    const publicKey = B.mul(copySecretKey)

    const keyPair = {
        "publicKeyX": publicKey.x.n.toString(),
        "publicKeyY": publicKey.y.n.toString(),
        "secretKey": secretKey.toString()
    }

    return keyPair
}


export type EddsaKey = {
    keyPair: {
        publicKeyX: string;
        publicKeyY: string;
        secretKey: string;
    },
    formatedPx: string,
    formatedPy: string,
    sk: string
}

export function generateKey(sig: string): EddsaKey {
    if (sig) {
        const seedBuff = ethUtil.sha256(fm.toBuffer(sig))
        const seed = BigNumber.from('0x' + seedBuff.toString('hex'))
        const bitIntDataItems = bnToBufWithFixedLength(seed.toString(), 32)
        const keyPair = generateKeyPair(bitIntDataItems)

        const formatedPx = fm.formatEddsaKey(fm.toHex(fm.toBig(keyPair.publicKeyX)))
        const formatedPy = fm.formatEddsaKey(fm.toHex(fm.toBig(keyPair.publicKeyY)))
        const sk = toHex(toBig(keyPair.secretKey))

        return {
            keyPair,
            formatedPx,
            formatedPy,
            sk,
        }
    } else {
        throw Error("No signature")
    }
}


export const getEdDSASigWithPoseidon = (inputs: any, PrivateKey: string | undefined) => {
    const p = field.SNARK_SCALAR_FIELD
    const poseidonParams = new PoseidonParams(
        p,
        inputs.length + 1,
        6,
        53,
        'poseidon',
        BigNumber.from(5),
        null,
        null,
        128,
    )
    let bigIntInputs: any
    bigIntInputs = []
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i]
        bigIntInputs.push(BigNumber.from(input))
    }
    const hash = permunation.poseidon(bigIntInputs, poseidonParams)
    return {
        hash,
        result: genSigWithPadding(PrivateKey, hash),
    }
}
export const genSigWithPadding = (PrivateKey: string | undefined, hash: any) => {
    const signature = EDDSAUtil.sign(PrivateKey, hash)

    let signatureRx_Hex = fm.clearHexPrefix(fm.toHex(fm.toBN(signature.Rx)))
    if (signatureRx_Hex.length < 64) {
        const padding = new Array(64 - signatureRx_Hex.length).fill(0)
        signatureRx_Hex = padding.join('').toString() + signatureRx_Hex
    }

    let signatureRy_Hex = fm.clearHexPrefix(fm.toHex(fm.toBN(signature.Ry)))
    if (signatureRy_Hex.length < 64) {
        const padding = new Array(64 - signatureRy_Hex.length).fill(0)
        signatureRy_Hex = padding.join('').toString() + signatureRy_Hex
    }

    let signatureS_Hex = fm.clearHexPrefix(fm.toHex(fm.toBN(signature.s)))
    if (signatureS_Hex.length < 64) {
        const padding = new Array(64 - signatureS_Hex.length).fill(0)
        signatureS_Hex = padding.join('').toString() + signatureS_Hex
    }
    const result = '0x' + signatureRx_Hex + signatureRy_Hex + signatureS_Hex
    return result
}

export function convertPublicKey2(pk: { x: string, y: string }) {
    // return new BN(EdDSA.pack(pk.x, pk.y), 16);
    return new BN(EDDSAUtil.pack(pk.x, pk.y), 16)
}

export function getUpdateAccountEcdsaTypedData(data: UpdateAccountRequestV3, chainId: ChainId) {
    const message: any = {
        owner: data.owner,
        accountID: data.accountId,
        feeTokenID: data.maxFee.tokenId,
        maxFee: data.maxFee.volume,
        publicKey: fm.addHexPrefix(convertPublicKey2(data.publicKey).toString(16)),
        validUntil: data.validUntil,
        nonce: data.nonce,
    }

    const typedData = {
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            AccountUpdate: [
                { name: 'owner', type: 'address' },
                { name: 'accountID', type: 'uint32' },
                { name: 'feeTokenID', type: 'uint16' },
                { name: 'maxFee', type: 'uint96' },
                { name: 'publicKey', type: 'uint256' },
                { name: 'validUntil', type: 'uint32' },
                { name: 'nonce', type: 'uint32' },
            ],
        },
        primaryType: 'AccountUpdate',
        domain: {
            name: 'Loopring Protocol',
            version: '3.6.0',
            chainId,
            verifyingContract: data.exchange,
        },
        message: message,
    }

    return typedData
}

export function getTransferTypedData(
    data: OriginTransferRequestV3,
    chainId: ChainId,
) {
    const message = {
        from: data.payerAddr,
        to: data.payeeAddr,
        tokenID: data.token.tokenId,
        amount: data.token.volume,
        feeTokenID: data.maxFee.tokenId,
        maxFee: data.maxFee.volume,
        validUntil: data.validUntil,
        storageID: data.storageId,
    }
    const typedData = {
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
            Transfer: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'tokenID', type: 'uint16' },
                { name: 'amount', type: 'uint96' },
                { name: 'feeTokenID', type: 'uint16' },
                { name: 'maxFee', type: 'uint96' },
                { name: 'validUntil', type: 'uint32' },
                { name: 'storageID', type: 'uint32' },
            ],
        },
        primaryType: 'Transfer',
        domain: {
            name: 'Loopring Protocol',
            version: '3.6.0',
            chainId: chainId,
            verifyingContract: data.exchange,
        },
        message: message,
    }
    return typedData
}

export function get_EddsaSig_Transfer(request: OriginTransferRequestV3, eddsaKey: string) {
    const inputs = [
        new BN(ethUtil.toBuffer(request.exchange)).toString(),
        request.payerId,
        request.payeeId,
        request.token.tokenId,
        request.token.volume,
        request.maxFee.tokenId,
        request.maxFee.volume,
        new BN(ethUtil.toBuffer(request.payeeAddr)).toString(),
        0,
        0,
        request.validUntil,
        request.storageId,
    ]
    return getEdDSASigWithPoseidon(inputs, eddsaKey)
}


export function getEdDSASig(
    method: string,
    basePath: string,
    api_url: string,
    requestInfo: any,
    PrivateKey: string | undefined,
) {
    let params: string

    method = method.toUpperCase().trim()

    if (method === 'GET' || method === 'DELETE') {
        params = makeRequestParamStr(requestInfo)
    } else if (method === 'POST' || method === 'PUT') {
        params = makeObjectStr(requestInfo)
    } else {
        throw new Error(`${method} is not supported yet!`)
    }

    const uri = encodeURIComponent(`${basePath}${api_url}`)

    const message = `${method}&${uri}&${params}`
    let _hash: any = new BigInteger(crypto.SHA256(message).toString(), 16)

    let hash = _hash.mod(SNARK_SCALAR_FIELD).toFormat(0, 0, {})

    const sig = genSigWithPadding(PrivateKey, hash)

    return sig
}


const makeRequestParamStr = (request: Map<string, any>) => {
    const arrObj = Array.from(request)
    arrObj.sort(function (a, b) {
        return a[0].localeCompare(b[0])
    })
    const orderedMap = new Map(arrObj.map((i) => [i[0], i[1]]))

    const paramlist: Array<string> = []

    const keys = Object.keys(Object.fromEntries(orderedMap))

    if (keys) {
        keys.forEach((key: string) => {
            const value = request.get(key)
            if (value !== undefined && value !== '') paramlist.push(`${key}=${value}`)
        })
    }

    // force to change encode ',' due to different encode rules between server and client
    return encodeURIComponent(paramlist.join('&')).replace(/%2C/g, '%252C')
}


const makeObjectStr = (request: Map<string, any>) => {
    const jsonTxt = JSON.stringify(Object.fromEntries(request))
    return encodeURIComponent(jsonTxt).replace(/[!'()]/g, escape) //replace(/'/ig, "%27")
}