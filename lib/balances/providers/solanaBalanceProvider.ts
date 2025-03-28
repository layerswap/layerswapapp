import { Balance } from "../../../Models/Balance";
import { NetworkType, NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import { insertIfNotExists } from "./helpers";

export class SolanaBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return network.type === NetworkType.Solana
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        if (!address) return

        const tokens = insertIfNotExists(network.tokens || [], network.token)
        const SolanaWeb3 = await import("@solana/web3.js");
        const { PublicKey, Connection } = SolanaWeb3
        class SolanaConnection extends Connection { }
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const walletPublicKey = new PublicKey(address)
        let balances: Balance[] = []

        if (!network?.tokens || !walletPublicKey) return

        const connection = new SolanaConnection(
            `${network.node_url}`,
            "confirmed"
        );

        async function getTokenBalanceWeb3(connection: SolanaConnection, tokenAccount) {
            try {
                const info = await connection.getTokenAccountBalance(tokenAccount);
                return info?.value?.uiAmount;
            } catch (error) {
                if (error.message && error.message.includes("could not find account")) {
                    return 0;
                }
                throw error;
            }
        }

        for (const token of tokens) {
            try {
                let result: number | null = null
                if (token.contract) {
                    const sourceToken = new PublicKey(token?.contract!);
                    const associatedTokenFrom = await getAssociatedTokenAddress(
                        sourceToken,
                        walletPublicKey
                    );
                    if (!associatedTokenFrom) return
                    result = await getTokenBalanceWeb3(connection, associatedTokenFrom)
                } else {
                    const res = await connection.getBalance(walletPublicKey)
                    result = res ? formatAmount(Number(res), token.decimals) : 0
                }

                if (result != null && !isNaN(result)) {
                    const balance = {
                        network: network.name,
                        token: token.symbol,
                        amount: result,
                        request_time: new Date().toJSON(),
                        decimals: Number(token?.decimals),
                        isNativeCurrency: false
                    }

                    balances = [
                        ...balances,
                        balance
                    ]
                }

            }
            catch (e) {
                console.log(e)
            }
        }

        return balances
    }
}
