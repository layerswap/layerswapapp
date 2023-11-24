import { Balance, BalanceProps, BalanceProvider, Gas, GasProps } from "../../../hooks/useBalance";
import KnownInternalNames from "../../knownIds";
import formatAmount from "../../formatAmount";
import { createPublicClient, http } from 'viem';

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
    value: {
        blockhash: string,
        feeCalculator: {
            lamportsPerSignature: number
        },
        lastValidBlockHeight: number,
        LastValidSlot: number
    }
}

export default function useSolanaBalance(): BalanceProvider {
    const name = 'solana'
    const supportedNetworks = [
        KnownInternalNames.Networks.SolanaMainnet
    ]

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

    //In progress, blocked by solana connect
    const getGas = async ({ layer, currency }: GasProps) => {

        let gas: Gas[] = [];
        if (layer.isExchange === true || !layer.assets) return

        const provider = createPublicClient({
            transport: http()//Must be solana rpc url
        })

        try {
            const result: SolanaGas = await provider.request({ method: 'getFees' as any })
            const currencyDec = layer?.assets?.find(l => l.asset === layer.native_currency)?.decimals
            const formatedGas = formatAmount(Math.max(result.value.feeCalculator.lamportsPerSignature, 10000000), currencyDec!)

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