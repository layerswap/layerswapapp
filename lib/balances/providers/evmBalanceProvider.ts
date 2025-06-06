
import { Chain, PublicClient } from "viem"
import { TokenBalance } from "../../../Models/Balance"
import { Network, NetworkType, NetworkWithTokens, Token } from "../../../Models/Network"
import formatAmount from "../../formatAmount"
import { http, createConfig } from '@wagmi/core'
import { erc20Abi } from 'viem'
import { multicall } from '@wagmi/core'
import { getBalance, GetBalanceReturnType } from '@wagmi/core'
import resolveChain from "../../resolveChain"
import { datadogRum } from "@datadog/browser-rum"
import BalanceGetterAbi from "../../abis/BALANCEGETTERABI.json"
import KnownInternalNames from "../../knownIds"

export class EVMBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return network.type === NetworkType.EVM && !!network.token
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {

        if (!network) return
        const chain = resolveChain(network)
        if (!chain) throw new Error("Could not resolve chain")

        try {
            const balances = await this.contractGetBalances(address, chain, network)
            return balances
        } catch (e) {
            console.log(e)
        }

        const balances = await this.getBalances(address, chain, network)

        return balances
    }

    getBalances = async (address: string, chain: Chain, network: NetworkWithTokens): Promise<TokenBalance[] | undefined> => {
        try {
            const { createPublicClient, http } = await import("viem")
            const publicClient = createPublicClient({
                chain,
                transport: http(network.node_url, { retryCount: 1, timeout: 5000 })
            })

            let erc20Balances: TokenBalance[] = []

            const erc20Promise = getErc20Balances({
                address,
                assets: network.tokens,
                network,
                publicClient,
                hasMulticall: !!network.metadata?.evm_multicall_contract
            });
            const nativeToken = network.token
            const nativePromise = getTokenBalance(address as `0x${string}`, network)

            const [erc20BalancesContractRes, nativeBalanceData] = await Promise.all([
                erc20Promise,
                nativePromise,
            ]);

            const balances = (erc20BalancesContractRes && resolveERC20Balances(
                erc20BalancesContractRes,
                network
            )) || [];
            erc20Balances = balances

            const nativeBalance = (nativeToken && nativeBalanceData) && resolveBalance(network, nativeToken, nativeBalanceData)
            let res: TokenBalance[] = []
            return res.concat(erc20Balances, nativeBalance ? [nativeBalance] : [])
        }
        catch (e) {
            console.log(e)
        }
    }

    contractGetBalances = async (address: string, chain: Chain, network: NetworkWithTokens): Promise<TokenBalance[] | null> => {
        if (!network) return null

        try {

            const { createPublicClient, http } = await import("viem")
            const publicClient = createPublicClient({
                chain,
                transport: http(network.node_url, { retryCount: 1, timeout: 5000 })
            })

            const contract = contracts.find(c => c.networks.includes(network.name))
            if (!contract) throw new Error(`No contract found for network ${network.name}`)

            const tokenContracts = network.tokens?.filter(a => a.contract).map(a => a.contract as `0x${string}`)

            const balances: any = await publicClient.readContract({
                address: contract?.address,
                abi: BalanceGetterAbi,
                functionName: 'getBalances',
                args: [address as `0x${string}`, tokenContracts]
            })

            const resolvedERC20Balances = network.tokens.filter(t => t.contract)?.map((token, index) => {
                const amount = balances[1][index]
                return {
                    network: network.name,
                    token: token.symbol,
                    amount: amount ? formatAmount(amount, token.decimals) : 0,
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: false,
                } as TokenBalance
            })

            const nativeTokenBalance = balances?.[1]?.[balances?.[1]?.length - 1]

            const nativeTokenResolvedBalance = network.token ? {
                network: network.name,
                token: network.token?.symbol,
                amount: formatAmount(nativeTokenBalance, network.token?.decimals),
                request_time: new Date().toJSON(),
                decimals: network.token?.decimals,
                isNativeCurrency: true,
            } : undefined

            const res = [...resolvedERC20Balances, nativeTokenResolvedBalance]

            return res.filter((b): b is TokenBalance => b !== null)
        }
        catch (e) {
            console.log(e)
            return null
        }
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

export const resolveERC20Balances = (
    multicallRes: ERC20ContractRes[],
    from: NetworkWithTokens,
) => {
    const assets = from?.tokens?.filter(a => a.contract)
    if (!assets)
        return null
    const contractBalances = multicallRes?.map((d, index) => {
        const currency = assets[index]
        return {
            network: from.name,
            token: currency.symbol,
            amount: formatAmount(d.result, currency.decimals),
            request_time: new Date().toJSON(),
            decimals: currency.decimals,
            isNativeCurrency: false,
        }
    })
    return contractBalances
}

type GetBalanceArgs = {
    address: string,
    network: Network,
    assets: Token[],
    publicClient: PublicClient,
    hasMulticall: boolean
}

export const getErc20Balances = async ({
    address,
    network,
    assets,
    publicClient,
    hasMulticall = false
}: GetBalanceArgs): Promise<ERC20ContractRes[] | null> => {

    const contracts = assets?.filter(a => a.contract).map(a => ({
        address: a?.contract as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
    }))

    try {
        if (hasMulticall) {
            const chain = resolveChain(network)
            if (!chain) throw new Error("Could not resolve chain")

            const config = createConfig({
                chains: [chain],
                transports: {
                    [chain.id]: http(network.node_url, { retryCount: 1, timeout: 5000 })
                }
            })

            const contractRes = await multicall(config, {
                chainId: chain.id,
                contracts: contracts
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
                        args: [address as `0x${string}`]
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
        const error = new Error(e)
        error.name = "ERC20BalanceError"
        error.cause = e
        datadogRum.addError(error);
        return null;
    }

}

export const getTokenBalance = async (address: `0x${string}`, network: Network, contract?: `0x${string}` | null): Promise<GetBalanceReturnType | null> => {

    try {
        const chain = resolveChain(network)
        if (!chain) throw new Error("Could not resolve chain")
        const config = createConfig({
            chains: [chain],
            transports: {
                [chain.id]: http(network.node_url, { retryCount: 1, timeout: 5000 })
            }
        })

        const res = await getBalance(config, {
            address,
            chainId: chain.id,
            ...(contract ? { token: contract } : {})
        })
        return res
    } catch (e) {
        const error = new Error(e)
        error.name = "TokenBalanceError"
        error.cause = e
        datadogRum.addError(error);
        return null
    }

}

export const resolveBalance = (
    network: Network,
    token: Token,
    balanceData: GetBalanceReturnType
) => {

    const nativeBalance: TokenBalance = {
        network: network.name,
        token: token.symbol,
        amount: formatAmount(balanceData?.value, token.decimals),
        request_time: new Date().toJSON(),
        decimals: token.decimals,
        isNativeCurrency: true,
    }

    return nativeBalance
}

export const resolveERC20Balance = (
    network: Network,
    token: Token,
    balanceData: GetBalanceReturnType
) => {

    const nativeBalance: TokenBalance = {
        network: network.name,
        token: token.symbol,
        amount: formatAmount(balanceData?.value, token.decimals),
        request_time: new Date().toJSON(),
        decimals: token.decimals,
        isNativeCurrency: false,
    }

    return nativeBalance
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