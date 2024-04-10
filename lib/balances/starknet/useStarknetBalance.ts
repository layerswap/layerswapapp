import KnownInternalNames from "../../knownIds"
import Erc20Abi from '../../abis/ERC20.json'
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, NetworkBalancesProps } from "../../../Models/Balance";
import { useRouter } from "next/router";

export default function useStarknetBalance(): BalanceProvider {

    const supportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli,
        KnownInternalNames.Networks.StarkNetSepolia,
    ]
    const router = useRouter()

    const getNetworkBalances = async ({ network, address }: NetworkBalancesProps) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        let balances: Balance[] = []

        if (!network.tokens) return

        const provider = new RpcProvider({
            nodeUrl: network.node_url,
        });

        for (let i = 0; i < network.tokens.length; i++) {
            try {
                const asset = network.tokens[i]

                const erc20 = new Contract(Erc20Abi, asset.contract!, provider);
                const balanceResult = await erc20.balanceOf(address);
                const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance).toString()).toString();

                const balance = {
                    network: network.name,
                    token: asset.symbol,
                    amount: formatAmount(balanceInWei, asset.decimals),
                    request_time: new Date().toJSON(),
                    decimals: asset.decimals,
                    isNativeCurrency: false,
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


    const getBalance = async ({ network, token, address }: BalanceProps) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        let balances: Balance[] = []


        const provider = new RpcProvider({
            nodeUrl: network.node_url,
        });

        try {

            const erc20 = new Contract(Erc20Abi, token.contract!, provider);
            const balanceResult = await erc20.balanceOf(address);
            const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance).toString()).toString();

            return {
                network: network.name,
                token: token.symbol,
                amount: formatAmount(balanceInWei, token.decimals),
                request_time: new Date().toJSON(),
                decimals: token.decimals,
                isNativeCurrency: false,
            }
            
        }
        catch (e) {
            console.log(e)
        }

    }

    // const getGas = async ({ layer, currency, wallet }: GasProps) => {

    //     const nodeUrl = layer.node_url
    //     const asset = layer.tokens.find(a => a.symbol === currency.symbol)
    //     const nativeAsset = layer.tokens.find(a => a.is_native)
    //     const contract_address = asset?.contract
    //     const recipient = layer.managed_accounts[0].address

    //     if (!asset || !nativeAsset) return

    //     const client = new InternalApiClient()
    //     const basePath = router.basePath ?? '/'
    //     const feeEstimateResponse: ApiResponse<EstimateFee> = await client.GetStarknetFee(`nodeUrl=${nodeUrl}&walletAddress=${wallet?.address}&contractAddress=${contract_address}&recipient=${recipient}&watchDogContract=${layer.metadata?.WatchdogContractAddress}`, basePath)

    //     if (!feeEstimateResponse?.data?.suggestedMaxFee) {
    //         throw new Error(`Couldn't get fee estimation for the transfer. Response: ${JSON.stringify(feeEstimateResponse)}`);
    //     };

    //     const feeInWei = feeEstimateResponse.data.suggestedMaxFee.toString();

    //     const gas = {
    //         token: currency.symbol,
    //         gas: formatAmount(feeInWei, nativeAsset.decimals),
    //         request_time: new Date().toJSON()
    //     }

    //     return [gas]

    // }

    return {
        getNetworkBalances,
        getBalance,
        // getGas,
        supportedNetworks
    }
}