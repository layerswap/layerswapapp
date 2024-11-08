
import { Balance } from "../../../Models/Balance"
import { NetworkType, NetworkWithTokens } from "../../../Models/Network"

export class EVMBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return network.type === NetworkType.EVM
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {

        if (!network) return
    
        try {
            const resolveChain = (await import("../../resolveChain")).default
            const chain = resolveChain(network)
            if (!chain) return
    
            const { createPublicClient, http } = await import("viem")
            const publicClient = createPublicClient({
                chain,
                transport: http()
            })
    
            const {
                getErc20Balances,
                getTokenBalance,
                resolveERC20Balances,
                resolveBalance
            } = await import("../../balances/evm/balance")
    
            const erc20BalancesContractRes = await getErc20Balances({
                address,
                assets: network.tokens,
                network,
                publicClient,
                hasMulticall: !!network.metadata?.evm_multicall_contract
            });
    
            const erc20Balances = (erc20BalancesContractRes && await resolveERC20Balances(
                erc20BalancesContractRes,
                network
            )) || [];
    
            const nativeTokens = network.tokens.filter(t => !t.contract)
            const nativeBalances: Balance[] = []
    
            for (let i = 0; i < nativeTokens.length; i++) {
                const token = nativeTokens[i]
                const nativeBalanceData = await getTokenBalance(address as `0x${string}`, network)
                const nativeBalance = (nativeBalanceData
                    && await resolveBalance(network, token, nativeBalanceData))
                if (nativeBalance)
                    nativeBalances.push(nativeBalance)
            }
    
            let res: Balance[] = []

            console.log(erc20Balances, nativeBalances)
            return res.concat(erc20Balances, nativeBalances)
        }
        catch (e) {
            console.log(e)
        }
    }
}