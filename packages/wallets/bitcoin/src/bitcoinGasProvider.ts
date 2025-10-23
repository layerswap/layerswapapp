import { buildPsbt } from "./services/transferService/transactionBuilder/buildPsbt";
import { JsonRpcClient, KnownInternalNames, formatUnits } from "@layerswap/widget/internal";
import { Network, GasProps, GasWithToken, GasProvider } from "@layerswap/widget/types";

export class BitcoinGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    async getGas({ address, network, recipientAddress, amount }: GasProps): Promise<GasWithToken | undefined> {
        if (!network?.token) throw new Error("No native token provided")
        if (!address) throw new Error("No address provided")
        if (!amount) throw new Error("No amount provided")

        const version = KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) ? 'mainnet' : 'testnet';
        const bitcoinAddress = recipientAddress || version == 'testnet' ? 'tb1q5dc7f552h57tfepls66tgkta8wwjpha3ktw45s': 'bc1plxa9q77gz9r33g8pd4c2ygzezchjffuedtzdrkclyceseyw8v80qasmquf'
        const rpcClient = new JsonRpcClient(network.node_url);

        const amountInSatoshi = Math.floor(amount * 1e8);
        const hexMemo = Number('69420').toString(16);

        try {
            const { fee } = await buildPsbt({
                userAddress: address,
                depositAddress: bitcoinAddress,
                version: version,
                memo: hexMemo,
                amount: amountInSatoshi,
                rpcClient: rpcClient
            })
            const formattedGas = Number(formatUnits(BigInt(fee), network.token.decimals))
            return { gas: formattedGas, token: network.token }

        } catch (e) {
            console.log(e)
        }

    }
}