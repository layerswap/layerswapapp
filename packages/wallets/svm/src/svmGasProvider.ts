import { GasProps, Network, NetworkType, GasProvider } from "@layerswap/widget/types";
import { transactionBuilderForGas } from "./utils/transactionBuilderForGas";
import { formatUnits } from "@layerswap/widget/internal";

export class SolanaGasProvider implements GasProvider {
    supportsNetwork(network: Network): boolean {
        return network.type === NetworkType.Solana
    }

    getGas = async ({ address, network, token }: GasProps) => {
        if (!address)
            return
        const { PublicKey, Connection } = await import("@solana/web3.js");

        const walletPublicKey = new PublicKey(address)

        const connection = new Connection(
            `${network.node_url}`,
            "confirmed"
        );

        if (!walletPublicKey) return

        try {

            const transaction = await transactionBuilderForGas(network, token, walletPublicKey)

            if (!transaction || !network.token) return

            const message = transaction.compileMessage();
            const result = await connection.getFeeForMessage(message)

            const formatedGas = Number(formatUnits(BigInt(result.value), network.token?.decimals))

            if (formatedGas) return { gas: formatedGas, token: network.token }

        }
        catch (e) {
            console.log(e)
        }
    }
}