import { NetworkType } from '@layerswap/widget-types';
import { Network } from "@layerswap/widget-types";
import { GasProps, GasProvider } from "@layerswap/widget-types";
import { transactionBuilderForGas } from "./utils";
import { formatUnits } from "@layerswap/utils";
import { ErrorHandler } from "@layerswap/widget-types";

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
            // A native transfer must not leave the sender between 0 and the
            // rent-exempt minimum, or the runtime rejects the transaction.
            const [result, rentExemptMinimum] = await Promise.all([
                connection.getFeeForMessage(message),
                token.contract ? undefined : connection.getMinimumBalanceForRentExemption(0),
            ])

            if (result.value) {
                const formatedGas = Number(formatUnits(BigInt(result.value), network.token?.decimals))
                const reserve = rentExemptMinimum ? Number(formatUnits(BigInt(rentExemptMinimum), network.token?.decimals)) : undefined
                return { gas: formatedGas, token: network.token, reserve }
            }
        }
        catch (e) {
            const error = e as Error;
            ErrorHandler({
                type: "GasProviderError",
                message: error.message,
                name: error.name,
                stack: error.stack,
                cause: error.cause
            })
        }
    }
}