import { Gas, GasProps } from "../../../Models/Balance";
import { Network } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";

export class SolanaGasProvider {
    supportsNetwork(network: Network): boolean {
        return KnownInternalNames.Networks.SolanaMainnet.includes(network.name)
    }

    getGas = async ({ network, token, address }: GasProps) => {
        if (!address)
            return
        const { PublicKey, Connection } = await import("@solana/web3.js");

        const walletPublicKey = new PublicKey(address)

        let gas: Gas[] = [];

        const connection = new Connection(
            `${network.node_url}`,
            "confirmed"
        );

        if (!walletPublicKey) return

        try {
            const transactionBuilder = ((await import("../../wallets/solana/transactionBuilder")).default);

            const transaction = await transactionBuilder(network, token, walletPublicKey)

            if (!transaction || !network.token) return

            const message = transaction.compileMessage();
            const result = await connection.getFeeForMessage(message)

            const formatedGas = formatAmount(result.value, network.token?.decimals)

            gas = [{
                token: token.symbol,
                gas: formatedGas,
                request_time: new Date().toJSON()
            }]
        }
        catch (e) {
            console.log(e)
        }

        return gas
    }
}