import { Balance } from "../../../Models/Balance";
import { NetworkType, NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import Erc20Abi from '../../abis/ERC20.json'



export class StarknetBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return network.type === NetworkType.Starknet
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        let balances: Balance[] = []

        if (!network?.tokens) return

        const provider = new RpcProvider({
            nodeUrl: network.node_url,
        });

        for (let i = 0; i < network.tokens.length; i++) {
            try {
                const token = network.tokens[i]

                const erc20 = new Contract(Erc20Abi, token.contract!, provider);
                const balanceResult = await erc20.balanceOf(address);
                const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance).toString()).toString();

                const balance = {
                    network: network.name,
                    token: token.symbol,
                    amount: formatAmount(balanceInWei, token.decimals),
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
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

}