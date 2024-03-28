
import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import {
    Balance,
    BalanceProps,
    BalanceProvider,
    Gas,
    GasProps
} from "../../../Models/Balance";

export default function useSolanaBalance(): BalanceProvider {
    const supportedNetworks = [
        KnownInternalNames.Networks.SolanaMainnet
    ]

    const getBalance = async ({ network: layer, address }: BalanceProps) => {
        const SolanaWeb3 = await import("@solana/web3.js");
        const { PublicKey, Connection } = SolanaWeb3
        class SolanaConnection extends Connection { }
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const walletPublicKey = new PublicKey(address)
        let balances: Balance[] = []

        if (!layer.tokens || !walletPublicKey) return

        const connection = new SolanaConnection(
            `${layer.node_url}`,
            "confirmed"
        );

        async function getTokenBalanceWeb3(connection: SolanaConnection, tokenAccount) {
            const info = await connection.getTokenAccountBalance(tokenAccount);
            return info?.value?.uiAmount;
        }

        for (let i = 0; i < layer.tokens.length; i++) {
            try {
                const asset = layer.tokens[i]
                const sourceToken = new PublicKey(asset?.contract!);
                const associatedTokenFrom = await getAssociatedTokenAddress(
                    sourceToken,
                    walletPublicKey
                );
                const result = await getTokenBalanceWeb3(connection, associatedTokenFrom)

                if (result != null && !isNaN(result)) {
                    const balance = {
                        network: layer.name,
                        token: asset.symbol,
                        amount: result,
                        request_time: new Date().toJSON(),
                        decimals: Number(asset?.decimals),
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

    const getGas = async ({ network: layer, currency, address }: GasProps) => {
        if (!address)
            return
        const { PublicKey, Connection } = await import("@solana/web3.js");

        const walletPublicKey = new PublicKey(address)

        let gas: Gas[] = [];
        if (!layer.tokens) return

        const connection = new Connection(
            `${layer.node_url}`,
            "confirmed"
        );

        if (!walletPublicKey) return

        try {
            const transactionBuilder = ((await import("../../wallets/solana/transactionBuilder")).default);

            const transaction = await transactionBuilder(layer, currency, walletPublicKey)

            if (!transaction) return

            const message = transaction.compileMessage();
            const result = await connection.getFeeForMessage(message)
            const currencyDec = layer?.tokens?.find(l => l.is_native)?.decimals
            const formatedGas = formatAmount(result.value, currencyDec!)

            gas = [{
                token: currency.symbol,
                gas: formatedGas,
                request_time: new Date().toJSON()
            }]
        }
        catch (e) {
            console.log(e)
        }

        return gas
    }

    return {
        getBalance,
        getGas,
        supportedNetworks
    }
}