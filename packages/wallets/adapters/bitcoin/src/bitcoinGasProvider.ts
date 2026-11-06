import { bitcoinMemo } from "./transferProvider/bitcoinMemo.js";
import { estimateBitcoinFees } from "./transferProvider/transactionBuilder/buildPsbt.js";
import { JsonRpcClient, KnownInternalNames, formatUnits } from "@layerswap/utils";
import { ErrorHandler } from "@layerswap/widget-types";
import { Network } from "@layerswap/widget-types";
import { GasProps, GasWithToken, GasProvider } from "@layerswap/widget-types";

export class BitcoinGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    async getGas({ address, network, recipientAddress, amount, callData }: GasProps): Promise<GasWithToken | undefined> {
        if (!network?.token) throw new Error("No native token provided")
        if (!address) throw new Error("No address provided")
        if (!amount) throw new Error("No amount provided")

        const version = KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) ? 'mainnet' : 'testnet';
        const bitcoinAddress = recipientAddress || (version == 'testnet' ? 'tb1q5dc7f552h57tfepls66tgkta8wwjpha3ktw45s': 'bc1plxa9q77gz9r33g8pd4c2ygzezchjffuedtzdrkclyceseyw8v80qasmquf')
        const rpcClient = new JsonRpcClient(network.node_url);

        const amountInSatoshi = Math.floor(amount * 1e8);

        try {
            // Before creation the sequence is unknown. Once supplied, use exactly
            // the same memo conversion as the transaction sender.
            const hexMemo = bitcoinMemo(callData ?? '69420');
            const { fee, requiredFee } = await estimateBitcoinFees({
                userAddress: address,
                depositAddress: bitcoinAddress,
                version: version,
                memo: hexMemo,
                amount: amountInSatoshi,
                rpcClient: rpcClient
            })
            const formattedGas = Number(formatUnits(BigInt(fee), network.token.decimals))
            if (formattedGas) {
                return { gas: formattedGas, requiredFee: Number(formatUnits(requiredFee, network.token.decimals)), token: network.token }
            }

        } catch (e) {
            const error = e as Error;
            ErrorHandler({
                type: "GasProviderError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            });
        }
    }
}