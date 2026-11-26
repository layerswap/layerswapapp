import { address, networks } from 'bitcoinjs-lib';
import { buildPsbt } from "./buildPsbt.js";
import { bitcoinInputType } from "./inputScripts.js";
import { TransactionBuilderParams } from "./types";

export const transactionBuilder = async (props: TransactionBuilderParams) => {

    const { psbt, fee, requiredFee } = await buildPsbt(props);

    const network = props.version == 'testnet' ? networks.testnet : networks.bitcoin
    const sigHash = bitcoinInputType(address.toOutputScript(props.userAddress, network)) === 'p2tr' ? 0 : 1
    const inputsToSign = [{
        address: props.userAddress,
        sigHash,
        signingIndexes: psbt.data.inputs.map((_, index) => index),
    }]

    return {
        psbt,
        inputsToSign,
        fee,
        requiredFee,
    }

}