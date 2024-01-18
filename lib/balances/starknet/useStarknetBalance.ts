import KnownInternalNames from "../../knownIds"
import Erc20Abi from '../../abis/ERC20.json'
import formatAmount from "../../formatAmount";
import { Balance, BalanceProps, BalanceProvider, GasProps } from "../../../Models/Balance";
import InternalApiClient from "../../internalApiClient";
import { EstimateFee } from "starknet";
import { ApiResponse } from "../../../Models/ApiResponse";

export default function useStarknetBalance(): BalanceProvider {
    const name = 'starknet'

    const supportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli
    ]

    const getBalance = async ({ layer, address }: BalanceProps) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets) return

        const provider = new RpcProvider({
            nodeUrl: layer.nodes[0].url,
        });

        for (let i = 0; i < layer.assets.length; i++) {
            try {
                const asset = layer.assets[i]

                const erc20 = new Contract(Erc20Abi, asset.contract_address!, provider);
                const balanceResult = await erc20.balanceOf(address);
                const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance).toString()).toString();

                const balance = {
                    network: layer.internal_name,
                    token: asset.asset,
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

    const getGas = async ({ layer, currency, wallet }: GasProps) => {

        if (layer.isExchange) return

        const nodeUrl = layer.nodes[0].url
        const asset = layer.assets.find(a => a.asset === currency.asset)
        const nativeAsset = layer.assets.find(a => a.asset === layer.native_currency)
        const contract_address = asset?.contract_address
        const recipient = layer.assets[0].network?.managed_accounts[0].address

        if (!asset || !nativeAsset) return

        const client = new InternalApiClient()

        const feeEstimateResponse: ApiResponse<EstimateFee> = await client.GetStarknetFee(`nodeUrl=${nodeUrl}&walletAddress=${wallet?.address}&contractAddress=${contract_address}&recipient=${recipient}&watchDogContract=${layer.metadata?.WatchdogContractAddress}`)

        if (!feeEstimateResponse?.data?.suggestedMaxFee) {
            throw new Error(`Couldn't get fee estimation for the transfer. Response: ${JSON.stringify(feeEstimateResponse)}`);
        };

        const feeInWei = feeEstimateResponse.data.suggestedMaxFee.toString();

        const gas = {
            token: currency.asset,
            gas: formatAmount(feeInWei, nativeAsset.decimals),
            request_time: new Date().toJSON()
        }

        return [gas]

    }

    return {
        getBalance,
        getGas,
        name,
        supportedNetworks
    }
}