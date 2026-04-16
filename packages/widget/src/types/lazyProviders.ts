import { TokenBalance, GasProps } from "@/Models/Balance";
import { Network, NetworkWithTokens } from "@/Models/Network";
import { BalanceProvider } from "./balance";
import { GasProvider, GasWithToken } from "./gas";

/**
 * A lazy-loading wrapper around BalanceProvider that defers the actual provider
 * module import until the first fetchBalance() call. This enables code-splitting
 * so heavy SDK dependencies (viem, @wagmi/core, etc.) are not included in the
 * initial bundle.
 *
 * The supportsNetwork() predicate runs synchronously without loading the module.
 * The actual provider is loaded once on first use, then cached for subsequent calls.
 */
export class LazyBalanceProvider extends BalanceProvider {
    private instance: BalanceProvider | null = null;
    private loadingPromise: Promise<BalanceProvider> | null = null;

    constructor(
        private readonly networkPredicate: (network: NetworkWithTokens) => boolean,
        private readonly loader: () => Promise<BalanceProvider>,
    ) {
        super();
    }

    supportsNetwork = (network: NetworkWithTokens): boolean => {
        return this.networkPredicate(network);
    };

    fetchBalance = async (
        address: string,
        network: NetworkWithTokens,
        options?: { timeoutMs?: number; retryCount?: number }
    ): Promise<TokenBalance[] | null | undefined> => {
        const provider = await this.resolve();
        return provider.fetchBalance(address, network, options);
    };

    private async resolve(): Promise<BalanceProvider> {
        if (this.instance) return this.instance;
        if (!this.loadingPromise) {
            this.loadingPromise = this.loader().then(p => {
                this.instance = p;
                this.loadingPromise = null;
                return p;
            });
        }
        return this.loadingPromise;
    }
}

/**
 * A lazy-loading wrapper around GasProvider that defers the actual provider
 * module import until the first getGas() call.
 */
export class LazyGasProvider implements GasProvider {
    private instance: GasProvider | null = null;
    private loadingPromise: Promise<GasProvider> | null = null;

    constructor(
        private readonly networkPredicate: (network: Network) => boolean,
        private readonly loader: () => Promise<GasProvider>,
    ) {}

    supportsNetwork(network: Network): boolean {
        return this.networkPredicate(network);
    }

    async getGas(args: GasProps): Promise<GasWithToken | undefined> {
        const provider = await this.resolve();
        return provider.getGas(args);
    }

    private async resolve(): Promise<GasProvider> {
        if (this.instance) return this.instance;
        if (!this.loadingPromise) {
            this.loadingPromise = this.loader().then(p => {
                this.instance = p;
                this.loadingPromise = null;
                return p;
            });
        }
        return this.loadingPromise;
    }
}
