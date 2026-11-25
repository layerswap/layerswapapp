import { capabilitiesForChain, type GasWithToken, type Network, type Token, type Wallet } from '@layerswap/widget-types'
import { erc20Abi, formatUnits, type PublicClient } from 'viem'

type NativeGas = Pick<GasWithToken, 'gas' | 'maxFee' | 'reserve'>

/**
 * Prices the fee in the transferred token when the wallet pays gas in tokens
 * (EIP-5792 `alternateGasFees`), the native balance cannot cover it, and the
 * token balance left after the transfer can. Otherwise the native fee stands.
 */
export async function resolveTokenPaidGas({ publicClient, network, token, wallet, account, amount, nativeGas }: {
    publicClient: PublicClient
    network: Network
    token: Token
    wallet: Wallet | undefined
    account: `0x${string}`
    amount: number | undefined
    nativeGas: NativeGas
}): Promise<GasWithToken | undefined> {
    const nativeToken = network.token
    const nativePrice = nativeToken?.price_in_usd
    const tokenPrice = token.price_in_usd
    const chains = wallet?.metadata?.capabilities?.[account.toLowerCase()]
    if (!token.contract || !nativeToken || nativeGas.reserve || !nativePrice || !tokenPrice
        || capabilitiesForChain(chains, Number(network.chain_id))?.alternateGasFees !== true) {
        return undefined
    }

    const [nativeBalance, tokenBalance] = await Promise.all([
        publicClient.getBalance({ address: account }),
        publicClient.readContract({ address: token.contract as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [account] }),
    ])
    const requiredFee = nativeGas.maxFee ?? nativeGas.gas
    if (Number(formatUnits(nativeBalance, nativeToken.decimals)) >= requiredFee) {
        return undefined
    }

    const toToken = (nativeAmount: number) => nativeAmount * nativePrice / tokenPrice
    const available = Number(formatUnits(tokenBalance, token.decimals))
    if (available < (amount ?? 0) + toToken(requiredFee)) {
        return undefined
    }

    return {
        gas: toToken(nativeGas.gas),
        ...(nativeGas.maxFee != null ? { maxFee: toToken(nativeGas.maxFee) } : {}),
        token,
    }
}
