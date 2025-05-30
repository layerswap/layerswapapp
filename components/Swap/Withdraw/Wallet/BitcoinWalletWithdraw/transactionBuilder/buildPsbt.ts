import axios from "axios";
import { Psbt, Transaction, networks, opcodes, script } from 'bitcoinjs-lib';
import { TransactionBuilderParams } from "./types";
import { estimateFee } from "./estimateFee";

export interface Utxo {
    txid: string
    vout: number
    value: number
    status: { confirmed: boolean; block_height?: number }
}

export async function buildPsbt({ amount, depositAddress, userAddress, memo, version, rpcClient }: TransactionBuilderParams) {

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

    // Check if we have enough funds
    const minFee = 1000; // Minimum reasonable fee
    if (total < amount + minFee) {
        throw new Error('Insufficient funds');
    }

    const fee = await estimateFee(psbt, rpcClient, version, utxos);
console.log(fee)
    const changeSat = Number((total - amount - Number(fee)).toFixed());
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
