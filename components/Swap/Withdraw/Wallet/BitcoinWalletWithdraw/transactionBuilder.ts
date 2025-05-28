import { BtcRpcRequestFn, Chain, Client, Transport } from "@bigmi/core";
import axios from "axios";
import { Psbt, Transaction, address, networks, opcodes, script } from 'bitcoinjs-lib';

type TransactionBuilderParams = {
    amount: number,
    depositAddress: string,
    userAddress: string,
    memo: string,
    feeRate?: number
    version?: 'mainnet' | 'testnet'
    publicClient?: Client<Transport<string, Record<string, any>, BtcRpcRequestFn>, Chain>
}

export const transactionBuilder = async (props: TransactionBuilderParams) => {

    const { psbt, utxos } = await buildPsbt(props);

    const inputsToSign = Array.from(
        psbt.data.inputs
            .reduce((map, input, index) => {
                const accountAddress = input.witnessUtxo
                    ? address.fromOutputScript(
                        input.witnessUtxo.script,
                        props.version == 'testnet' ? networks.testnet : networks.bitcoin
                    )
                    : (props.publicClient?.account?.address as string)
                if (map.has(accountAddress)) {
                    map.get(accountAddress).signingIndexes.push(index)
                } else {
                    map.set(accountAddress, {
                        address: accountAddress,
                        sigHash: 1, // Default to Transaction.SIGHASH_ALL - 1
                        signingIndexes: [index],
                    })
                }
                return map
            }, new Map())
            .values()
    )

    return {
        psbt,
        inputsToSign,
        utxos
    }

}

async function buildPsbt({ amount, depositAddress, userAddress, memo, version }: TransactionBuilderParams) {

    const utxos = await getUTXOs(userAddress, version);
    let total = 0;
    const psbt = new Psbt({ network: version == 'testnet' ? networks.testnet : networks.bitcoin });
    for (const u of utxos) {
        const rawHex = await fetchRawTxHex(u.txid, version)
        const tx = Transaction.fromHex(rawHex)
        const out = tx.outs[u.vout]
        psbt.addInput({
            hash: u.txid,
            index: u.vout,
            witnessUtxo: { script: out.script, value: out.value }
        })
        total += u.value;
    }

    psbt.addOutput({ address: depositAddress, value: BigInt(amount) })

    const data = Buffer.from(memo, 'utf8')
    if (data.length > 80) throw new Error('Memo too long; must be ≤ 80 bytes')

    const embed = script.compile([
        opcodes.OP_RETURN,
        data,
    ])

    psbt.addOutput({
        script: embed,
        value: 0n,
    })

    const vsize = (psbt as any).__CACHE.__TX.virtualSize(); // Accessing private property to get vsize
    const feeRate = await fetchFee(version);
    const fee = vsize * feeRate; // Calculate fee in satoshis

    const changeSat = total - amount - fee;
    if (changeSat < 0) {
        throw new Error(`Total UTXO value: ${total} satoshi, Amount: ${amount} satoshi, Fee: ${fee} satoshi, Change: ${changeSat} satoshi`);
    }

    psbt.addOutput({
        address: userAddress,
        value: BigInt(changeSat),
    });

    return { psbt, utxos }
}

const getUTXOs = async (address: string, version?: 'mainnet' | 'testnet'): Promise<Utxo[]> => {
    try {
        const url = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}/api/address/${address}/utxo`;
        const utxosData = await axios.get<Utxo[]>(url)
        const utxos = utxosData.data;

        return utxos
    } catch (error) {
        console.error('Error fetching UTXOs:', error);
        throw new Error('Failed to fetch UTXOs');
    }
}

async function fetchRawTxHex(txid: string, version?: 'mainnet' | 'testnet'): Promise<string> {
    const url = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}/api/tx/${txid}/hex`;
    const res = await fetch(url)
    if (!res.ok) throw new Error(res.statusText)
    return res.text()
}

async function fetchFee(version?: 'mainnet' | 'testnet'): Promise<number> {
    try {
        const url = `https://mempool.space${version === 'testnet' ? '/testnet' : ''}/api/v1/fees/recommended`;
        const res = await axios.get(url)
        return res.data.economyFee
    }
    catch (error) {
        console.error('Error fetching fee:', error);
        throw new Error('Failed to fetch fee');
    }
}

interface Utxo {
    txid: string
    vout: number
    value: number
    status: { confirmed: boolean; block_height?: number }
}
