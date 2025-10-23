import { multicall, getBalance, GetBalanceReturnType, createConfig, http } from '@wagmi/core'
import { Chain, formatUnits, PublicClient, erc20Abi, createPublicClient } from "viem"
import resolveChain from "../evmUtils/resolveChain"
import BalanceGetterAbi from "../jsons/BALANCEGETTERABI.json"
import { KnownInternalNames } from "@layerswap/widget/internal";
import { BalanceProvider, TokenBalance, NetworkType, NetworkWithTokens, Token, Network } from "@layerswap/widget/types"


export class EVMBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.type === NetworkType.EVM && !!network.token
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        if (!network) return
        const chain = resolveChain(network)
        if (!chain) throw new Error("Could not resolve chain")

        try {
            const balances = await this.contractGetBalances(address, chain, network, options)
            return balances
        } catch (e) {
            console.log(e)
        }

        const balances = await this.getBalances(address, chain, network, options)

        return balances
    }

    getBalances = async (address: string, chain: Chain, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }): Promise<TokenBalance[] | undefined> => {
        try {
            const publicClient = createPublicClient({
                chain,
                transport: http(network.node_url, { retryCount: options?.retryCount ?? 3, timeout: options?.timeoutMs ?? 60000 })
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

            const nativePromise = getTokenBalance(address as `0x${string}`, network, undefined, options?.timeoutMs, options?.retryCount)

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
            console.log("********* errorororororor *********", e)
            return network.tokens.map(t => this.resolveTokenBalanceFetchError(e, t, network))
        }
    }

    contractGetBalances = async (address: string, chain: Chain, network: NetworkWithTokens, options?: { timeoutMs?: number, retryCount?: number }): Promise<TokenBalance[] | null> => {
        if (!network) throw new Error("Network is required for contract get balances")


        const { createPublicClient, http } = await import("viem")
        const publicClient = createPublicClient({
            chain,
            transport: http(network.node_url, { retryCount: options?.retryCount ?? 3, timeout: options?.timeoutMs ?? 60000 })
        })

        const contract = contracts.find(c => c.networks.includes(network.name))
        if (!contract) throw new Error(`No contract found for network ${network.name}`)

        const tokenContracts = network.tokens?.filter(a => a.contract).map(a => a.contract as `0x${string}`)

        const balances = await publicClient.readContract({
            address: contract?.address as `0x${string}`,
            abi: BalanceGetterAbi,
            functionName: 'getBalances',
            args: [address as `0x${string}`, tokenContracts],
            authorizationList: undefined
        }) as [string[], number[]]

        const resolvedERC20Balances = network.tokens.filter(t => t.contract)?.map((token, index) => {
            const amount = balances[1][index]

            if (amount >= 0) return {
                network: network.name,
                token: token.symbol,
                amount: formatUnits(BigInt(amount), token.decimals),
                request_time: new Date().toJSON(),
                decimals: token.decimals,
                isNativeCurrency: false,
            }
            else {
                return {
                    network: network.name,
                    token: token.symbol,
                    amount: undefined,
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: false,
                    error: `Could not fetch ${token.symbol} balance`
                }
            }
        })

        const nativeTokenBalance = Number(balances?.[1]?.[balances?.[1]?.length - 1])

        const nativeTokenResolvedBalance: TokenBalance | undefined = network.token?.decimals ? {
            network: network.name,
            token: network.token?.symbol,
            amount: nativeTokenBalance >= 0 ? Number(formatUnits(BigInt(nativeTokenBalance), network.token?.decimals)) : undefined,
            request_time: new Date().toJSON(),
            decimals: network.token?.decimals,
            isNativeCurrency: true,
            error: nativeTokenBalance === undefined ? "Could not fetch native token balance" : undefined
        } : undefined

        const res = [...resolvedERC20Balances, nativeTokenResolvedBalance].filter((b): b is TokenBalance => b !== undefined)

        return res
    }

    resolveERC20Balances = (
        multicallRes: ERC20ContractRes[],
        network: NetworkWithTokens,
    ) => {
        const assets = network?.tokens?.filter(a => a.contract)
        if (!assets)
            return null
        const contractBalances = multicallRes?.map((d, index) => {
            const currency = assets[index]
            if (!d.error) {
                return {
                    network: network.name,
                    token: currency.symbol,
                    amount: Number(formatUnits(BigInt(d.result as string | number), currency.decimals)),
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
            amount: Number(formatUnits(BigInt((balanceData as GetBalanceReturnType)?.value), token.decimals)),
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
                    [chain.id]: http(network.node_url, { retryCount: retryCount ?? 3, timeout: timeoutMs ?? 60000 })
                }
            })

            const contractRes = await multicall(config, {
                chainId: chain.id,
                contracts: contracts,
            })
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
                [chain.id]: http(network.node_url, { retryCount: retryCount ?? 3, timeout: timeoutMs ?? 60000 })
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


const contracts = [
    {
        address: '0xb65a146b7C2D5BEec6EE8a5F38C467b5A88b26Dc' as `0x${string}`,
        networks: [
            KnownInternalNames.Networks.EthereumMainnet,
            KnownInternalNames.Networks.BaseMainnet,
            KnownInternalNames.Networks.RariMainnet,
            KnownInternalNames.Networks.ScrollMainnet,
            KnownInternalNames.Networks.LineaMainnet,
            KnownInternalNames.Networks.LightlinkMainnet,
            KnownInternalNames.Networks.NahmiiMainnet,
            KnownInternalNames.Networks.ZetachainMainnet,
            KnownInternalNames.Networks.AvaxMainnet,
            KnownInternalNames.Networks.ZksyncEraMainnet,
            KnownInternalNames.Networks.XaiMainnet,
            KnownInternalNames.Networks.RedStoneMainnet,
            KnownInternalNames.Networks.UnichainMainnet,
            KnownInternalNames.Networks.SoneiumMainnet,
            KnownInternalNames.Networks.ArbitrumNova,
            KnownInternalNames.Networks.MantleMainnet,
            KnownInternalNames.Networks.PolygonZkMainnet,
            KnownInternalNames.Networks.ZoraMainnet,
            KnownInternalNames.Networks.FraxtalMainnet,
            KnownInternalNames.Networks.ModMainnet,
            KnownInternalNames.Networks.WorldchainMainnet,
            KnownInternalNames.Networks.MantaMainnet,
            KnownInternalNames.Networks.AbstractMainnet,
            KnownInternalNames.Networks.BlastMainnet,
            KnownInternalNames.Networks.CeloMainnet,
            KnownInternalNames.Networks.KromaMainnet,
            KnownInternalNames.Networks.ShapeMainnet,
            KnownInternalNames.Networks.GnosisMainnet,
            KnownInternalNames.Networks.TaikoMainnet,
            KnownInternalNames.Networks.OKCMainnet,
            KnownInternalNames.Networks.BNBChainMainnet,
            KnownInternalNames.Networks.PolygonMainnet,
            KnownInternalNames.Networks.RoninMainnet,
            KnownInternalNames.Networks.InkMainnet,
            KnownInternalNames.Networks.MintMainnet,
            KnownInternalNames.Networks.Ancient8Mainnet,
            KnownInternalNames.Networks.BobMainnet,
            KnownInternalNames.Networks.FuseMainnet,
            KnownInternalNames.Networks.SonicMainnet,
            KnownInternalNames.Networks.ImmutableZkEVM,
            KnownInternalNames.Networks.OptimismMainnet,
            KnownInternalNames.Networks.RolluxMainnet,
            KnownInternalNames.Networks.ZeroMainnet,
            KnownInternalNames.Networks.ZircuitMainnet,
            KnownInternalNames.Networks.OpBNBMainnet,
            KnownInternalNames.Networks.SuperseedMainnet,
            KnownInternalNames.Networks.LiskMainnet,
            KnownInternalNames.Networks.MorphMainnet,
            KnownInternalNames.Networks.SeiMainnet,
            KnownInternalNames.Networks.GravityMainnet
        ]
    },
    {
        address: '0xf3C74887D68Cd6d6c64Fb9ab24ca6812182eED44' as `0x${string}`,
        networks: [
            KnownInternalNames.Networks.ArbitrumMainnet,
        ]
    },
    {
        address: '0x1930cC92B9dCBBE2E8FA0E05c858A88EE39C41E6' as `0x${string}`,
        networks: [
            KnownInternalNames.Networks.SophonMainnet,
        ]
    }
]