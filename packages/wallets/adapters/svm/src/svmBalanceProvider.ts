import { NetworkType } from '@layerswap/widget-types';
import { fetchWithTimeout, formatUnits } from "@layerswap/utils";
import { BalanceProvider, insertIfNotExists } from "@layerswap/widget-types";

export class SolanaBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.type === NetworkType.Solana
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, _options) => {
        if (!address) return

        const tokens = insertIfNotExists(network.tokens || [], network.token)
        const [{ PublicKey, Connection }, { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID }] = await Promise.all([
            import("@solana/web3.js"),
            import("@solana/spl-token"),
        ]);
        class SolanaConnection extends Connection { }
        const walletPublicKey = new PublicKey(address)

        const connection = new SolanaConnection(
            `${network.node_url}`,
            {
                commitment: "confirmed",
                fetch(input, init) {
                    return fetchWithTimeout(input, { ...init, timeoutMs: _options?.timeoutMs ?? 60000 })
                },
            }
        );

        const [nativeBalance, legacyAccounts, token2022Accounts] = await Promise.all([
            connection.getBalance(walletPublicKey),
            connection.getParsedTokenAccountsByOwner(walletPublicKey, {
                programId: TOKEN_PROGRAM_ID,
            }),
            connection.getParsedTokenAccountsByOwner(walletPublicKey, {
                programId: TOKEN_2022_PROGRAM_ID,
            }),
        ]);

        const balancesByMint = new Map<string, number>();
        for (const { account } of [...legacyAccounts.value, ...token2022Accounts.value]) {
            const { mint, tokenAmount } = account.data.parsed.info;
            const amount = Number(tokenAmount.uiAmountString);
            if (Number.isFinite(amount)) {
                balancesByMint.set(mint, (balancesByMint.get(mint) ?? 0) + amount);
            }
        }

        return tokens.map(token => {
            try {
                const result = token.contract
                    ? balancesByMint.get(new PublicKey(token.contract).toBase58()) ?? 0
                    : Number(formatUnits(BigInt(nativeBalance), token.decimals));

                if (Number.isFinite(result)) {
                    return {
                        network: network.name,
                        token: token.symbol,
                        amount: result,
                        request_time: new Date().toJSON(),
                        decimals: Number(token?.decimals),
                        isNativeCurrency: !token.contract,
                    };
                }

                return this.resolveTokenBalanceFetchError(
                    new Error(`Invalid balance returned for ${token.asset}`),
                    token,
                    network,
                    !token.contract,
                );
            }
            catch (error) {
                return this.resolveTokenBalanceFetchError(
                    error instanceof Error ? error : new Error(String(error)),
                    token,
                    network,
                    !token.contract,
                );
            }
        })
    }
}
