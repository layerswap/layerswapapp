import { useSettingsState } from "../../../context/settings"
import { Balance, BalanceProps, BalanceProvider, GasProps, NetworkBalancesProps } from "../../../Models/Balance"
import { NetworkType } from "../../../Models/Network"

export default function useEVMBalance(): BalanceProvider {
    const { networks } = useSettingsState()
    const supportedNetworks = networks
        .filter(l =>
            l.type === NetworkType.EVM
            && l.token)
        .map(l => l.name)

    const getNetworkBalances = async ({ networkName, address }: NetworkBalancesProps) => {
        const network = networks.find(n => n.name === networkName)

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
            } = await import("./balance")

            const erc20BalancesContractRes = await getErc20Balances({
                address: address,
                chainId: Number(network?.chain_id),
                assets: network.tokens,
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
                const nativeBalanceData = await getTokenBalance(address as `0x${string}`, Number(network.chain_id))
                const nativeBalance = (nativeBalanceData
                    && await resolveBalance(network, token, nativeBalanceData))
                if (nativeBalance)
                    nativeBalances.push(nativeBalance)
            }

            let res: Balance[] = []
            return res.concat(erc20Balances, nativeBalances)
        }
        catch (e) {
            console.log(e)
        }
    }


    const getBalance = async ({ network, token, address }: BalanceProps) => {
        try {
            const resolveChain = (await import("../../resolveChain")).default
            const chain = resolveChain(network)
            if (!chain) return

            const {
                getTokenBalance,
                resolveBalance,
                resolveERC20Balance
            } = await import("./balance")

            const balanceData = await getTokenBalance(address as `0x${string}`, Number(network.chain_id), token.contract as `0x${string}`)
            const balance = (balanceData
                && (network.token?.symbol === token.symbol ? await resolveBalance(network, token, balanceData) : await resolveERC20Balance(network, token, balanceData)))

            return balance
        }
        catch (e) {
            console.log(e)
        }
    }


    const getGas = async ({ network, address, token, isSweeplessTx, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe' }: GasProps) => {

        const chainId = Number(network?.chain_id)

        if (!network || !address || isSweeplessTx === undefined || !chainId || !recipientAddress) {
            return
        }

        const contract_address = token.contract as `0x${string}`

        try {

            const { createPublicClient, http } = await import("viem")
            const resolveNetworkChain = (await import("../../resolveChain")).default
            const publicClient = createPublicClient({
                chain: resolveNetworkChain(network),
                transport: http(),
            })

            const getEthereumGas = (await import("./gas/ethereum")).default
            const getOptimismGas = (await import("./gas/optimism")).default

            const getGas = network?.metadata?.evm_oracle_contract ? getOptimismGas : getEthereumGas

            const gasProvider = new getGas(
                {

                    publicClient,
                    chainId,
                    contract_address,
                    account: address,
                    from: network,
                    currency: token,
                    destination: recipientAddress as `0x${string}`,
                    nativeToken: token,
                    isSweeplessTx,
                }
            )

            const gas = await gasProvider.resolveGas()

            return [gas!]

        }
        catch (e) {
            console.log(e)
        }

    }

    return {
        getNetworkBalances,
        getBalance,
        getGas,
        supportedNetworks
    }
}