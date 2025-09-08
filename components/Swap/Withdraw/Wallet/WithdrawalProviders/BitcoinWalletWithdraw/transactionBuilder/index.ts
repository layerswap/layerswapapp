import { address, networks } from 'bitcoinjs-lib';
import { buildPsbt } from "./buildPsbt";
import { TransactionBuilderParams } from "./types";

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