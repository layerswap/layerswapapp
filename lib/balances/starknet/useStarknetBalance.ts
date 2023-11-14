import { Layer } from "../../../Models/Layer"
import { Balance, BalanceProvider } from "../../../hooks/useBalance"
import { Currency } from "../../../Models/Currency"
import KnownInternalNames from "../../knownIds"
import { Contract, RpcProvider, uint256 } from "starknet";
import Erc20Abi from '../../abis/ERC20.json'
import { BigNumber } from "ethers";
import formatAmount from "../../formatAmount";


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

    const getGas = async (layer: Layer, address: string, currency: Currency, userDestinationAddress: string) => {
        return []

    }

    return {
        getBalance,
        getGas,
        name,
        supportedNetworks
    }
}