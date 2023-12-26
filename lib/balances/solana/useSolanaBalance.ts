
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
    const name = 'solana'
    const supportedNetworks = [
        KnownInternalNames.Networks.SolanaMainnet
    ]

    const getBalance = async ({ layer, address }: BalanceProps) => {
        const { PublicKey, Connection } = await import("@solana/web3.js");
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const walletPublicKey = new PublicKey(address)
        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets || !walletPublicKey) return

        const connection = new Connection(
            `${layer.nodes[0].url}`,
            "confirmed"
        );

        async function getTokenBalanceWeb3(connection: any, tokenAccount) {
            const info = await connection.getTokenAccountBalance(tokenAccount);
            if (!info.value.uiAmount && info.value.uiAmount !== 0) console.log('No balance found');
            return info.value.uiAmount;
        }

        const assets = layer.assets.filter(a => a.status !== 'inactive')

        for (let i = 0; i < assets.length; i++) {
            try {
                const asset = assets[i]
                const sourceToken = new PublicKey(asset?.contract_address!);
                const associatedTokenFrom = await getAssociatedTokenAddress(
                    sourceToken,
                    walletPublicKey
                );
                const result = await getTokenBalanceWeb3(connection, associatedTokenFrom)

                if (result || result === 0) {
                    const balance = {
                        network: layer.internal_name,
                        token: asset.asset,
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

    const getGas = async ({ layer, currency, address }: GasProps) => {
        if (!address)
            return
        const { PublicKey, Connection } = await import("@solana/web3.js");

        const walletPublicKey = new PublicKey(address)

        let gas: Gas[] = [];
        if (layer.isExchange === true || !layer.assets) return

        const connection = new Connection(
            `${layer.nodes[0].url}`,
            "confirmed"
        );

        if (!walletPublicKey) return

        try {
            const transactionBuilder = ((await import("../../wallets/solana/transactionBuilder")).default);

            const transaction = await transactionBuilder(layer, currency, walletPublicKey)

            if (!transaction) return

            const message = transaction.compileMessage();
            const result = await connection.getFeeForMessage(message)
            const currencyDec = layer?.assets?.find(l => l.asset === layer.native_currency)?.decimals
            const formatedGas = formatAmount(result.value, currencyDec!)

            gas = [{
                token: currency.asset,
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
        name,
        supportedNetworks
    }
}