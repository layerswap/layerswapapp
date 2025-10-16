import { KnownInternalNames, insertIfNotExists, formatUnits } from "@layerswap/widget/internal";
import { TronWeb } from 'tronweb'
import { BalanceProvider, Network, Token, TokenBalance } from "@layerswap/widget/types";

export class TronBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return KnownInternalNames.Networks.TronMainnet.includes(network.name)
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        let balances: TokenBalance[] = []
        const provider = new TronWeb({ fullNode: network.node_url, solidityNode: network.node_url, privateKey: '01', });
        const tokens = insertIfNotExists(network.tokens, network.token)

        for (const token of tokens) {
            try {
                const balance = await resolveBalance({ network, address, token, provider })

                balances.push(balance)

            }
            catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e, token, network))
            }
        }

        return balances
    }
}

type GetBalanceProps = {
    network: Network,
    token: Token,
    address: string,
    provider: TronWeb
}

export const resolveBalance = async ({ address, network, token, provider }: GetBalanceProps) => {

    if (token.contract) {
        const res = await getTRC20Balance({ network, token, address, provider })
        return res
    }
    else {
        const res = await getNativeAssetBalance({ network, token, address, provider })
        return res
    }
}

const getNativeAssetBalance = async ({ network, token, address, provider }: GetBalanceProps) => {

    const balance = await provider.trx.getBalance(address);

    return ({
        network: network.name,
        token: token.symbol,
        amount: Number(formatUnits(BigInt(balance.toString()), Number(token?.decimals))),
        request_time: new Date().toJSON(),
        decimals: Number(token?.decimals),
        isNativeCurrency: true,
    })

}

const getTRC20Balance = async ({ network, token, address, provider }: GetBalanceProps) => {
    if (!token.contract) throw new Error("Token contract address is missing")

    const tokenContractAddress = token.contract;
    const contract = await provider.contract().at(tokenContractAddress);

    const balanceResponse = await contract.methods.balanceOf(address).call();

    const balance = {
        network: network.name,
        token: token.symbol,
        amount: Number(formatUnits(BigInt(balanceResponse as any), token.decimals)),
        request_time: new Date().toJSON(),
        decimals: token.decimals,
        isNativeCurrency: false,
    }

    return balance
}