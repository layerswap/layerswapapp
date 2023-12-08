import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../hooks/useBalance";
import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { createPublicClient, http } from 'viem';
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

type SolanaBalance = {
    value: SolanaAccount[]
}

type SolanaAccount = {
    account: {
        data: {
            parsed: {
                info: {
                    isNative: boolean,
                    mint: string,
                    owner: string,
                    state: string,
                    tokenAmount: {
                        amount: string,
                        decimals: number,
                        uiAmount: number,
                        uiAmountString: string
                    }
                }
                type: string
            }
        }
    }
}

type SolanaGas = {
    context: {
        apiVersion: string,
        slot: number
    },
    value: number
}

export default function useSolanaBalance(): BalanceProvider {
    const name = 'solana'
    const supportedNetworks = [
        KnownInternalNames.Networks.SolanaMainnet
    ]

    const { publicKey: walletPublicKey } = useSolanaWallet()

    const getBalance = async ({ layer, address }: BalanceProps) => {

        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets) return

        const provider = createPublicClient({
            transport: http(layer.nodes[0].url)
        })

        for (let i = 0; i < layer.assets.length; i++) {
            try {
                const asset = layer.assets[i]

                const result: SolanaBalance = await provider.request({ method: 'getTokenAccountsByOwner' as any, params: [address as any, { mint: asset?.contract_address } as any, { encoding: "jsonParsed" } as any] });

                const balance = {
                    network: layer.internal_name,
                    token: asset.asset,
                    amount: result.value[0].account.data.parsed.info.tokenAmount.uiAmount,
                    request_time: new Date().toJSON(),
                    decimals: Number(asset?.decimals),
                    isNativeCurrency: false
                }

                balances = [
                    ...balances,
                    balance
                ]
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

        const provider = createPublicClient({
            transport: http(layer.nodes[0].url)
        })

        if (!walletPublicKey) return

        try {

            const connection = new Connection(
                `${layer.nodes[0].url}`,
                "confirmed"
            );

            const asset = layer.assets.find(a => currency.asset === a.asset)

            const sourceToken = new PublicKey(asset?.contract_address!);
            const recipientAddress = new PublicKey(layer.assets[0].network?.managed_accounts[0].address!);

            const transactionInstructions: TransactionInstruction[] = [];
            const associatedTokenFrom = await getAssociatedTokenAddress(
                sourceToken,
                walletPublicKey
            );
            const fromAccount = await getAccount(connection, associatedTokenFrom);
            const associatedTokenTo = await getAssociatedTokenAddress(
                sourceToken,
                recipientAddress
            );

            if (!(await connection.getAccountInfo(associatedTokenTo))) {
                transactionInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        walletPublicKey,
                        associatedTokenTo,
                        recipientAddress,
                        sourceToken
                    )
                );
            }
            transactionInstructions.push(
                createTransferInstruction(
                    fromAccount.address,
                    associatedTokenTo,
                    walletPublicKey,
                    20000 * Math.pow(10, Number(asset?.decimals))
                )
            );
            const blockhash: any = await provider.request({ method: 'getLatestBlockhash' as any, params: [{ commitment: "processed" } as any] })

            const transaction = new Transaction({
                feePayer: walletPublicKey,
                blockhash: blockhash.value.blockhash,
                lastValidBlockHeight: blockhash.value.lastValidBlockHeight
            }).add(...transactionInstructions);
            const message = transaction.compileMessage();

            const result: SolanaGas = await provider.request({ method: 'getFeeForMessage' as any, params: [message.serialize().toString('base64') as any, { commitment: "processed" } as any] })
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