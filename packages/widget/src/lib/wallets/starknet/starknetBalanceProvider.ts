import { TokenBalance } from "@/Models/Balance";
import formatAmount from "@/lib/formatAmount";
import Erc20Abi from '@/lib/jsons/abis/ERC20.json'
import KnownInternalNames from "@/lib/knownIds";
import { insertIfNotExists } from "@/lib/balances/helpers";
import { BalanceProvider } from "@/types/balance";

export class StarknetBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.name) || KnownInternalNames.Networks.StarkNetGoerli.includes(network.name) || KnownInternalNames.Networks.StarkNetSepolia.includes(network.name))
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        let balances: TokenBalance[] = []

        if (!network?.tokens) return

        const provider = new RpcProvider({
            nodeUrl: network.node_url,
        });

        const tokens = insertIfNotExists(network.tokens || [], network.token)

        for (const token of tokens) {
            try {

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
                balances.push(balance)

            }
            catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e, token, network))
            }
        }
        return balances
    }
}