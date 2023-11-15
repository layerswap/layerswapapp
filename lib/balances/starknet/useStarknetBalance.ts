import { Layer } from "../../../Models/Layer"
import { Balance, BalanceProvider, Gas } from "../../../hooks/useBalance"
import { Currency } from "../../../Models/Currency"
import KnownInternalNames from "../../knownIds"
import { CallData, Contract, RpcProvider, cairo, uint256, Provider, Account, constants } from "starknet";
import Erc20Abi from '../../abis/ERC20.json'
import { BigNumber } from "ethers";
import formatAmount from "../../formatAmount";
import { Wallet } from "../../../stores/walletStore";

export default function useStarknetBalance(): BalanceProvider {
    const name = 'starknet'

    const supportedNetworks = [
        KnownInternalNames.Networks.StarkNetMainnet,
        KnownInternalNames.Networks.StarkNetGoerli
    ]

    const getBalance = async (layer: Layer, address: string) => {

        let balances: Balance[] = []

        if (layer.isExchange === true || !layer.assets) return

        const provider = new RpcProvider({
            nodeUrl: layer.assets[0].network?.nodes[0].url!,
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

    const getGas = async (layer: Layer, address: string, currency: Currency, userDestinationAddress: string, wallet: Wallet) => {

        if (layer.isExchange === true || !layer.assets) return

        const amountToWithdraw = BigNumber.from(1);
        const privateKey = process.env.STARKNET_PRIVATE_KEY
        const accountAddress = '0x07d4f726a83c00ba1f3c09bdf3b4cd163531c22663911470a03b73cd183dc874'
        const contract_address = layer.assets.find(a => a.asset === currency.asset)?.contract_address
        const asset = layer.assets.find(a => a.asset === currency.asset)
        const FEE_ESTIMATE_MULTIPLIER = BigInt(4);

        if (!contract_address || !asset || !privateKey) return

        const provider = new RpcProvider({
            nodeUrl: layer.nodes[0].url
        });

        const account = new Account(provider, accountAddress, privateKey);

        let transferCall = {
            contractAddress: contract_address.toLowerCase(),
            entrypoint: "transfer",
            calldata: CallData.compile(
                {
                    recipient: accountAddress,
                    amount: cairo.uint256(amountToWithdraw.toHexString())
                })
        };

        let feeEstimateResponse = await account.estimateFee(transferCall);
        if (!feeEstimateResponse?.suggestedMaxFee) {
            throw new Error(`Couldn't get fee estimation for the transfer. Response: ${JSON.stringify(feeEstimateResponse)}`);
        };

        const feeInWei = (feeEstimateResponse.suggestedMaxFee * FEE_ESTIMATE_MULTIPLIER).toString();

        const gas = [{
            token: currency.asset,
            gas: formatAmount(feeInWei, asset.decimals),
            request_time: new Date().toJSON()
        }]

        return gas

    }

    return {
        getBalance,
        getGas,
        name,
        supportedNetworks
    }
}