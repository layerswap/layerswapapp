import { buildPsbt } from "@/components/Swap/Withdraw/Wallet/BitcoinWalletWithdraw/transactionBuilder/buildPsbt";
import { GasProps } from "../../../Models/Balance";
import { Network } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";
import { JsonRpcClient } from "@/lib/apiClients/jsonRpcClient";

export class BitcoinGasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.BitcoinMainnet.includes(network.name) || KnownInternalNames.Networks.BitcoinTestnet.includes(network.name)
    }

    async getGas({ address, network, recipientAddress, amount }: GasProps): Promise<number | undefined> {
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
            const formattedGas = formatAmount(fee, network.token.decimals)
            return formattedGas

        } catch (e) {
            console.log(e)
        }

    }
}