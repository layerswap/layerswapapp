import { address, networks } from 'bitcoinjs-lib';
import { buildPsbt } from "./buildPsbt";
import { TransactionBuilderParams } from "./types";

export const transactionBuilder = async (props: TransactionBuilderParams) => {

    const { psbt, utxos, error } = await buildPsbt(props);

    if (!psbt) {
        const msg = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);
        throw new Error(`Something went wrong: ${msg}`);
    }

    const inputsToSign = Array.from(
        psbt.data.inputs
            .reduce((map, input, index) => {
                const accountAddress = input.witnessUtxo
                    ? address.fromOutputScript(
                        input.witnessUtxo.script,
                        props.version == 'testnet' ? networks.testnet : networks.bitcoin
                    )
                    : (props.publicClient?.account?.address as string)
                // Taproot addresses (bc1p/tb1p) require SIGHASH_DEFAULT (0), others use SIGHASH_ALL (1)
                const isTaproot = accountAddress.startsWith('bc1p') || accountAddress.startsWith('tb1p')
                const sigHash = isTaproot ? 0 : 1

                if (map.has(accountAddress)) {
                    map.get(accountAddress).signingIndexes.push(index)
                } else {
                    map.set(accountAddress, {
                        address: accountAddress,
                        sigHash,
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