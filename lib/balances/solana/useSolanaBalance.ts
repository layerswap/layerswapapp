import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../hooks/useBalance";
import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { createPublicClient, http } from 'viem';
import { Blockhash, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';

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

    const { publicKey } = useSolanaWallet()

    const getBalance = async ({ layer, address }: BalanceProps) => {

        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets) return
        const provider = createPublicClient({
            transport: http(`https://odella-kzfk20-fast-mainnet.helius-rpc.com/`)
        })

        try {
            const currency = layer.assets.find(a => a.asset === 'USDC')
            if (!currency) return

            const result: SolanaBalance = await provider.request({ method: 'getTokenAccountsByOwner' as any, params: [address as any, { mint: currency?.contract_address } as any, { encoding: "jsonParsed" } as any] });

            balances = [
                {
                    network: layer.internal_name,
                    token: currency.asset,
                    amount: result.value[0].account.data.parsed.info.tokenAmount.uiAmount,
                    request_time: new Date().toJSON(),
                    decimals: Number(currency?.decimals),
                    isNativeCurrency: false
                }
            ]

        }
        catch (e) {
            console.log(e)
        }

        return balances
    }

    const getGas = async ({ layer, currency }: GasProps) => {

        let gas: Gas[] = [];
        if (layer.isExchange === true || !layer.assets) return

        const provider = createPublicClient({
            transport: http(layer.nodes[0].url)
        })

        if (!publicKey) return

        try {

            const toPublicKey = new PublicKey(layer.assets[0].network?.managed_accounts[0].address!);
            const blockhash: any = await provider.request({ method: 'getLatestBlockhash' as any, params: [{ commitment: "processed" } as any] })

            const transaction = new Transaction({
                feePayer: publicKey,
                recentBlockhash: blockhash?.value?.blockhash as Blockhash,
            }).add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: toPublicKey,
                    lamports: 100000,
                }),
            );
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