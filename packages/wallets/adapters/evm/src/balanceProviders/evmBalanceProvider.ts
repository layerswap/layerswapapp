import { BalanceProvider, NetworkType, type Network, type NetworkWithTokens, type Token, type TokenBalance } from '@layerswap/widget-types';
import { multicall, getBalance, GetBalanceReturnType, createConfig } from '@wagmi/core'
import { Chain, PublicClient, erc20Abi } from "viem"
import resolveChain from "../evmUtils/resolveChain"
import BalanceGetterAbi from "../jsons/BALANCEGETTERABI.json"
import { KnownInternalNames } from "@layerswap/utils";
import { resolveFallbackTransport } from "../evmUtils/resolveTransports"
import { toSafeBalanceNumber } from "./toSafeBalanceNumber"

const nativeBalanceSkip = [
    KnownInternalNames.Networks.TempoMainnet,
    KnownInternalNames.Networks.TempoTestnet
]

export class EVMBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.type === NetworkType.EVM && !!network.token
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        if (!network) return
        const chain = resolveChain(network)
        if (!chain) throw new Error("Could not resolve chain")

        if (network.metadata?.evm_balance_viewer_contract) {
            try {
                return await this.contractGetBalances(address, chain, network, options)
            } catch (e) {
                // A failed viewer call falls back to ordinary token and native balance reads.
                console.log(e)
            }
        }

        const balances = await this.getBalances(address, chain, network, options)

        return balances
    }

    getBalances = async (address: string, chain: Chain, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }): Promise<TokenBalance[] | undefined> => {
        try {
            const { createPublicClient } = await import("viem")
            const publicClient = createPublicClient({
                chain,
                transport: resolveFallbackTransport(network.nodes, { retryCount: options?.retryCount, timeoutMs: options?.timeoutMs })
            })

            let erc20Balances: TokenBalance[] = []

            const erc20Promise = getErc20Balances({
                address,
                assets: network.tokens,
                network,
                publicClient,
                hasMulticall: !!network.metadata?.evm_multicall_contract,
                timeoutMs: options?.timeoutMs,
                retryCount: options?.retryCount
            });
            const nativeToken = network.token
            const skipNativeBalance = nativeBalanceSkip.includes(network.name)

            const nativePromise = skipNativeBalance
                ? Promise.resolve(null)
                : getTokenBalance(address as `0x${string}`, network, undefined, options?.timeoutMs, options?.retryCount)

            const [erc20BalancesContractRes, nativeBalanceData] = await Promise.all([
                erc20Promise,
                nativePromise,
            ]);

            const balances = (erc20BalancesContractRes && this.resolveERC20Balances(
                erc20BalancesContractRes,
                network
            )) || [];
            erc20Balances = balances

            const nativeBalance = (nativeToken && nativeBalanceData) && this.resolveBalance(network, nativeToken, nativeBalanceData)
            let res: TokenBalance[] = []
            return res.concat(erc20Balances, nativeBalance ? [nativeBalance] : [])
        }
        catch (e) {
            throw e
        }
    }

    contractGetBalances = async (address: string, chain: Chain, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }): Promise<TokenBalance[] | null> => {
        if (!network) throw new Error("Network is required for contract get balances")

        const contract = network.metadata?.evm_balance_viewer_contract
        if (!contract) throw new Error(`No balance viewer contract configured for network ${network.name}`)

        const { createPublicClient } = await import("viem")
        const publicClient = createPublicClient({
            chain,
            transport: resolveFallbackTransport(network.nodes, { retryCount: options?.retryCount, timeoutMs: options?.timeoutMs })
        })

        const tokenContracts = network.tokens?.filter(a => a.contract).map(a => a.contract as `0x${string}`)

        const balances = await publicClient.readContract({
            address: contract as `0x${string}`,
            abi: BalanceGetterAbi,
            functionName: 'getBalances',
            args: [address as `0x${string}`, tokenContracts],
            authorizationList: undefined
        }) as [boolean[], bigint[]]

        const resolvedERC20Balances = network.tokens.filter(t => t.contract)?.map((token, index) => {
            const amount = balances[1][index]

            if (amount >= 0) {
                const formattedAmount = toSafeBalanceNumber(amount, token.decimals)
                return {
                    network: network.name,
                    token: token.symbol,
                    amount: formattedAmount,
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: false,
                }
            }
        })

        const nativeTokenBalance = balances?.[1]?.[balances?.[1]?.length - 1]

        const nativeTokenResolvedBalance: TokenBalance | undefined = network.token?.decimals ? {
            network: network.name,
            token: network.token?.symbol,
            amount: nativeTokenBalance >= 0 ? toSafeBalanceNumber(nativeTokenBalance, network.token?.decimals) : undefined,
            request_time: new Date().toJSON(),
            decimals: network.token?.decimals,
            isNativeCurrency: true,
        } : undefined

        const res = [...resolvedERC20Balances, nativeTokenResolvedBalance].filter((b): b is TokenBalance => b !== undefined)

        return res
    }

    resolveERC20Balances = (
        multicallRes: ERC20ContractRes[],
        network: NetworkWithTokens,
    ): TokenBalance[] | null => {
        const assets = network?.tokens?.filter(a => a.contract)
        if (!assets)
            return null
        const contractBalances = multicallRes?.map((d, index) => {
            const currency = assets[index]
            if (!d.error) {
                return {
                    network: network.name,
                    token: currency.symbol,
                    amount: toSafeBalanceNumber(BigInt(d.result as string | number), currency.decimals),
                    request_time: new Date().toJSON(),
                    decimals: currency.decimals,
                    isNativeCurrency: false,
                }
            } else {
                return this.resolveTokenBalanceFetchError(d.error, currency, network)
            }

        })
        return contractBalances
    }

    resolveBalance = (
        network: Network,
        token: Token,
        balanceData: NativeBalanceResponse
    ) => {

        if (balanceData.error !== null) return this.resolveTokenBalanceFetchError(new Error(balanceData.error), token, network)

        const nativeBalance: TokenBalance = {
            network: network.name,
            token: token.symbol,
            amount: toSafeBalanceNumber((balanceData as GetBalanceReturnType).value, token.decimals),
            request_time: new Date().toJSON(),
            decimals: token.decimals,
            isNativeCurrency: true,
        }

        return nativeBalance
    }

}

export type ERC20ContractRes = ({
    error: Error;
    result?: undefined | null;
    status: "failure";
} | {
    error?: undefined | null;
    result: unknown;
    status: "success";
})

type GetBalanceArgs = {
    address: string,
    network: Network,
    assets: Token[],
    publicClient: PublicClient,
    hasMulticall: boolean,
    timeoutMs?: number,
    retryCount?: number
}

export const getErc20Balances = async ({
    address,
    network,
    assets,
    publicClient,
    hasMulticall = false,
    timeoutMs,
    retryCount
}: GetBalanceArgs): Promise<ERC20ContractRes[] | null> => {

    const contracts = assets?.filter(a => a.contract).map(a => ({
        address: a?.contract as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        authorizationList: undefined
    }))

    try {
        if (hasMulticall) {
            const chain = resolveChain(network)
            if (!chain) throw new Error("Could not resolve chain")

            const config = createConfig({
                chains: [chain],
                transports: {
                    [chain.id]: resolveFallbackTransport(network.nodes, { retryCount, timeoutMs })
                }
            })

            const contractRes = await multicall(config, {
                chainId: chain.id,
                contracts: contracts,
            })

            // Failed calls stay failures: re-requesting them one by one only multiplies
            // requests against an RPC that is already rate limiting us.
            return contractRes
        }
        else {
            const balances: ERC20ContractRes[] = []
            for (let i = 0; i < contracts.length; i++) {
                try {
                    const contract = contracts[i]
                    const balance = await publicClient.readContract({
                        address: contract?.address as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'balanceOf',
                        args: [address as `0x${string}`],
                        authorizationList: undefined
                    })
                    balances.push({
                        status: "success",
                        result: balance,
                        error: undefined
                    })
                }
                catch (e) {
                    balances.push({
                        status: "failure",
                        result: null,
                        error: e?.message
                    })
                }
            }
            return balances
        }
    }
    catch (e) {
        return null;
    }

}

type NativeBalanceResponse = (GetBalanceReturnType & {
    error: null;
} | {
    error: string
})

export const getTokenBalance = async (address: `0x${string}`, network: Network, contract?: `0x${string}` | null, timeoutMs?: number, retryCount?: number): Promise<NativeBalanceResponse | null> => {

    try {
        const chain = resolveChain(network)
        if (!chain) throw new Error("Could not resolve chain")
        const config = createConfig({
            chains: [chain],
            transports: {
                [chain.id]: resolveFallbackTransport(network.nodes, { retryCount, timeoutMs })
            }
        })

        const res = await getBalance(config, {
            address,
            chainId: chain.id,
            ...(contract ? { token: contract } : {})
        })
        return { error: null, ...res }
    } catch (e) {
        return { error: e }
    }

}
