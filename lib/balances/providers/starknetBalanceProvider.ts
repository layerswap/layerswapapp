import { BalanceFetchError, TokenBalance } from "../../../Models/Balance";
import { NetworkWithTokens } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import Erc20Abi from '../../abis/ERC20.json'
import KnownInternalNames from "../../knownIds";
import { insertIfNotExists } from "./helpers";

export class StarknetBalanceProvider {
    supportsNetwork(network: NetworkWithTokens): boolean {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.name) || KnownInternalNames.Networks.StarkNetGoerli.includes(network.name) || KnownInternalNames.Networks.StarkNetSepolia.includes(network.name))
    }

    fetchBalance = async (address: string, network: NetworkWithTokens) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        const balances: TokenBalance[] = [];
        const errors: BalanceFetchError[] = [];

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

                balances.push({
                    network: network.name,
                    token: token.symbol,
                    amount: formatAmount(balanceInWei, token.decimals),
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: false,
                });
            }
            catch (e) {
                errors.push({
                    network: network.name,
                    token: token?.symbol ?? null,
                    message: e?.message ?? "Failed to fetch Starknet token balance",
                    code: e?.code,
                    cause: e,
                });
            }
        }
        return { balances, errors };
    }
}