import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../hooks/useBalance";
import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { Connection, PublicKey } from "@solana/web3.js";
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import transactionBuilder from "../../wallets/solana/transactionBuilder";

export default function useSolanaBalance(): BalanceProvider {
    const name = 'solana'
    const supportedNetworks = [
        KnownInternalNames.Networks.SolanaMainnet
    ]

    const { publicKey: walletPublicKey } = useSolanaWallet()

    const getBalance = async ({ layer }: BalanceProps) => {

        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets || !walletPublicKey) return

        const connection = new Connection(
            `${layer.nodes[0].url}`,
            "confirmed"
        );

        async function getTokenBalanceWeb3(connection: Connection, tokenAccount) {
            const info = await connection.getTokenAccountBalance(tokenAccount);
            if (!info.value.uiAmount) console.log('No balance found');
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

                if (result) {
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

    const getGas = async ({ layer, currency }: GasProps) => {

        let gas: Gas[] = [];
        if (layer.isExchange === true || !layer.assets) return

        const connection = new Connection(
            `${layer.nodes[0].url}`,
            "confirmed"
        );


        if (!walletPublicKey) return

        try {
            const transaction = await transactionBuilder(layer, currency, walletPublicKey)

            if (!transaction) return

            const message = transaction.compileMessage();
            const result = await connection.getFeeForMessage(message)
            const currencyDec = layer?.assets?.find(l => l.is_native)?.decimals
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