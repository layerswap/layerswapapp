import { EventEmitter } from "events";
import { getAccountsFromNamespaces, getSdkError, isValidArray } from "@walletconnect/utils";
import { KeyValueStorageOptions } from "@walletconnect/keyvaluestorage";

import {
    Metadata,
    Namespace,
    UniversalProvider,
    UniversalProviderOpts,
} from "@walletconnect/universal-provider";
import { AuthTypes, SessionTypes, SignClientTypes } from "@walletconnect/types";
import { JsonRpcResult } from "@walletconnect/jsonrpc-types";
import {
    STORAGE_KEY,
    REQUIRED_METHODS,
    REQUIRED_EVENTS,
    RPC_URL,
    OPTIONAL_METHODS,
    OPTIONAL_EVENTS,
} from "./constants";

export type RpcMethod =
    | "personal_sign"
    | "eth_sendTransaction"
    | "eth_accounts"
    | "eth_requestAccounts"
    | "eth_call"
    | "eth_getBalance"
    | "eth_sendRawTransaction"
    | "eth_sign"
    | "eth_signTransaction"
    | "eth_signTypedData"
    | "eth_signTypedData_v3"
    | "eth_signTypedData_v4"
    | "wallet_switchEthereumChain"
    | "wallet_addEthereumChain"
    | "wallet_getPermissions"
    | "wallet_requestPermissions"
    | "wallet_registerOnboarding"
    | "wallet_watchAsset"
    | "wallet_scanQRCode"
    | "wallet_sendCalls"
    | "wallet_getCapabilities"
    | "wallet_getCallsStatus"
    | "wallet_showCallsStatus";

export type RpcEvent = "accountsChanged" | "chainChanged" | "message" | "disconnect" | "connect";

export interface EthereumRpcMap {
    [chainId: string]: string;
}

export interface SessionEvent {
    event: { name: string; data: any };
    chainId: string;
}

export interface EthereumRpcConfig {
    chains: string[];
    optionalChains: string[];
    methods: string[];
    optionalMethods?: string[];
    /**
     * @description Events that the wallet MUST support or the connection will be rejected
     */
    events: string[];
    optionalEvents?: string[];
    rpcMap: EthereumRpcMap;
    projectId: string;
    metadata?: Metadata;
    showQrModal: boolean;
    qrModalOptions?: QrModalOptions;
}
export interface ConnectOps {
    chains?: number[];
    optionalChains?: number[];
    rpcMap?: EthereumRpcMap;
    pairingTopic?: string;
}

export type AuthenticateParams = {
    chains?: number[];
} & Omit<AuthTypes.SessionAuthenticateParams, "chains">;

export interface IEthereumProvider extends IProvider {
    connect(opts?: ConnectOps | undefined): Promise<void>;
}

export function getRpcUrl(chainId: string, rpc: EthereumRpcConfig): string | undefined {
    let rpcUrl: string | undefined;
    if (rpc.rpcMap) {
        rpcUrl = rpc.rpcMap[getEthereumChainId([chainId])];
    }
    return rpcUrl;
}

export function getEthereumChainId(chains: string[]): number {
    return Number(chains[0].split(":")[1]);
}

export function toHexChainId(chainId: number): string {
    return `0x${chainId.toString(16)}`;
}

export type NamespacesParams = {
    chains: EthereumRpcConfig["chains"];
    optionalChains: EthereumRpcConfig["optionalChains"];
    methods?: EthereumRpcConfig["methods"];
    optionalMethods?: EthereumRpcConfig["methods"];
    events?: EthereumRpcConfig["events"];
    rpcMap: EthereumRpcConfig["rpcMap"];
    optionalEvents?: EthereumRpcConfig["events"];
};

export function buildNamespaces(params: NamespacesParams): {
    required?: Namespace;
    optional?: Namespace;
} {
    const { chains, optionalChains, methods, optionalMethods, events, optionalEvents, rpcMap } =
        params;
    if (!isValidArray(chains)) {
        throw new Error("Invalid chains");
    }

    const required: Namespace = {
        chains,
        methods: methods || REQUIRED_METHODS,
        events: events || REQUIRED_EVENTS,
        rpcMap: {
            ...(chains.length
                ? { [getEthereumChainId(chains)]: rpcMap[getEthereumChainId(chains)] }
                : {}),
        },
    };

    // make a list of events and methods that require additional permissions
    // so we know if we should to include the required chains in the optional namespace
    const eventsRequiringPermissions = events?.filter((event) => !REQUIRED_EVENTS.includes(event));
    const methodsRequiringPermissions = methods?.filter((event) => !REQUIRED_METHODS.includes(event));

    if (
        !optionalChains &&
        !optionalEvents &&
        !optionalMethods &&
        !eventsRequiringPermissions?.length &&
        !methodsRequiringPermissions?.length
    ) {
        return { required: chains.length ? required : undefined };
    }

    /*
     * decides whether or not to include the required chains in the optional namespace
     * use case: if there is a single chain as required but additional methods/events as optional
     */
    const shouldIncludeRequiredChains =
        (eventsRequiringPermissions?.length && methodsRequiringPermissions?.length) || !optionalChains;

    const optional: Namespace = {
        chains: [
            ...new Set(
                shouldIncludeRequiredChains ? required.chains.concat(optionalChains || []) : optionalChains,
            ),
        ],
        methods: [
            ...new Set(
                required.methods.concat(optionalMethods?.length ? optionalMethods : OPTIONAL_METHODS),
            ),
        ],
        events: [
            ...new Set(required.events.concat(optionalEvents?.length ? optionalEvents : OPTIONAL_EVENTS)),
        ],
        rpcMap,
    };

    return {
        required: chains.length ? required : undefined,
        optional: optionalChains.length ? optional : undefined,
    };
}

// helper type to force setting at least one value in an array
type ArrayOneOrMore<T> = {
    0: T;
} & Array<T>;

/**
 * @param {number[]} chains - The Chains your app intents to use and the peer MUST support. If the peer does not support these chains, the connection will be rejected.
 * @param {number[]} optionalChains - The Chains your app MAY attempt to use and the peer MAY support. If the peer does not support these chains, the connection will still be established.
 * @description either chains or optionalChains must be provided
 */
export type ChainsProps =
    | {
        chains: ArrayOneOrMore<number>;
        optionalChains?: number[];
    }
    | {
        chains?: number[];
        optionalChains: ArrayOneOrMore<number>;
    };

export type EthereumProviderOptions = {
    projectId: string;
    /**
     * @note Methods that your app intents to use and the peer MUST support. If the peer does not support these methods, the connection will be rejected.
     * @default ["eth_sendTransaction", "personal_sign"]
     */
    methods?: string[];
    /**
     * @note Methods that your app MAY attempt to use and the peer MAY support. If the peer does not support these methods, the connection will still be established.
     */
    optionalMethods?: string[];
    events?: string[];
    optionalEvents?: string[];
    rpcMap?: EthereumRpcMap;
    metadata?: Metadata;
    showQrModal: boolean;
    qrModalOptions?: QrModalOptions;
    disableProviderPing?: boolean;
    relayUrl?: string;
    storageOptions?: KeyValueStorageOptions;
} & ChainsProps &
    UniversalProviderOpts;

export class EthereumProvider implements IEthereumProvider {
    public events = new EventEmitter();
    public namespace = "eip155";
    public accounts: string[] = [];
    public signer: InstanceType<typeof UniversalProvider>;
    public chainId = 1;
    public modal?: any;

    protected rpc: EthereumRpcConfig;
    protected readonly STORAGE_KEY = STORAGE_KEY;

    constructor() {
        // assigned during initialize
        this.signer = {} as InstanceType<typeof UniversalProvider>;
        this.rpc = {} as EthereumRpcConfig;
    }

    static async init(opts: EthereumProviderOptions): Promise<EthereumProvider> {
        const provider = new EthereumProvider();
        await provider.initialize(opts);
        return provider;
    }

    public async request<T = unknown>(args: RequestArguments, expiry?: number): Promise<T> {
        return await this.signer.request(args, this.formatChainId(this.chainId), expiry);
    }

    public sendAsync(
        args: RequestArguments,
        callback: (error: Error | null, response: JsonRpcResult) => void,
        expiry?: number,
    ): void {
        this.signer.sendAsync(args, callback, this.formatChainId(this.chainId), expiry);
    }

    get connected(): boolean {
        if (!this.signer.client) return false;
        return this.signer.client.core.relayer.connected;
    }

    get connecting(): boolean {
        if (!this.signer.client) return false;
        return this.signer.client.core.relayer.connecting;
    }

    public async enable(): Promise<ProviderAccounts> {
        if (!this.session) await this.connect();
        const accounts = await this.request({ method: "eth_requestAccounts" });
        return accounts as ProviderAccounts;
    }

    public async connect(opts?: ConnectOps): Promise<void> {
        if (!this.signer.client) {
            throw new Error("Provider not initialized. Call init() first");
        }

        this.loadConnectOpts(opts);
        const { required, optional } = buildNamespaces(this.rpc);
        try {
            const session = await new Promise<SessionTypes.Struct | undefined>(
                async (resolve, reject) => {
                    if (this.rpc.showQrModal) {
                        this.modal?.subscribeModal((state: { open: boolean }) => {
                            // the modal was closed so reject the promise
                            if (!state.open && !this.signer.session) {
                                this.signer.abortPairingAttempt();
                                reject(new Error("Connection request reset. Please try again."));
                            }
                        });
                    }
                    await this.signer
                        .connect({
                            namespaces: {
                                ...(required && {
                                    [this.namespace]: required,
                                }),
                            },
                            ...(optional && {
                                optionalNamespaces: {
                                    [this.namespace]: optional,
                                },
                            }),
                            pairingTopic: opts?.pairingTopic,
                        })
                        .then((session?: SessionTypes.Struct) => {
                            resolve(session);
                        })
                        .catch((error: Error) => {
                            reject(new Error(error.message));
                        });
                },
            );
            if (!session) return;

            const accounts = getAccountsFromNamespaces(session.namespaces, [this.namespace]);
            // if no required chains are set, use the approved accounts to fetch chainIds
            this.setChainIds(this.rpc.chains.length ? this.rpc.chains : accounts);
            this.setAccounts(accounts);
            this.events.emit("connect", { chainId: toHexChainId(this.chainId) });
        } catch (error) {
            this.signer.logger.error(error);
            throw error;
        } finally {
            if (this.modal) this.modal.closeModal();
        }
    }

    public async authenticate(
        params: AuthenticateParams,
        walletUniversalLink?: string,
    ): Promise<AuthTypes.AuthenticateResponseResult | undefined> {
        if (!this.signer.client) {
            throw new Error("Provider not initialized. Call init() first");
        }

        this.loadConnectOpts({
            chains: params?.chains,
        });

        try {
            const result = await new Promise<AuthTypes.AuthenticateResponseResult>(
                async (resolve, reject) => {
                    if (this.rpc.showQrModal) {
                        this.modal?.subscribeModal((state: { open: boolean }) => {
                            // the modal was closed so reject the promise
                            if (!state.open && !this.signer.session) {
                                this.signer.abortPairingAttempt();
                                reject(new Error("Connection request reset. Please try again."));
                            }
                        });
                    }
                    await this.signer
                        .authenticate(
                            {
                                ...params,
                                chains: this.rpc.chains,
                            },
                            walletUniversalLink,
                        )
                        .then((result: AuthTypes.AuthenticateResponseResult) => {
                            resolve(result);
                        })
                        .catch((error: Error) => {
                            reject(new Error(error.message));
                        });
                },
            );

            const session = result.session;
            if (session) {
                const accounts = getAccountsFromNamespaces(session.namespaces, [this.namespace]);
                // if no required chains are set, use the approved accounts to fetch chainIds as both contain <namespace>:<chainId>
                this.setChainIds(this.rpc.chains.length ? this.rpc.chains : accounts);
                this.setAccounts(accounts);
                this.events.emit("connect", { chainId: toHexChainId(this.chainId) });
            }
            return result;
        } catch (error) {
            this.signer.logger.error(error);
            throw error;
        } finally {
            if (this.modal) this.modal.closeModal();
        }
    }

    public async disconnect(): Promise<void> {
        if (this.session) {
            await this.signer.disconnect();
        }
        this.reset();
    }

    public on: IEthereumProviderEvents["on"] = (event, listener) => {
        this.events.on(event, listener);
        return this;
    };

    public once: IEthereumProviderEvents["once"] = (event, listener) => {
        this.events.once(event, listener);
        return this;
    };

    public removeListener: IEthereumProviderEvents["removeListener"] = (event, listener) => {
        this.events.removeListener(event, listener);
        return this;
    };

    public off: IEthereumProviderEvents["off"] = (event, listener) => {
        this.events.off(event, listener);
        return this;
    };

    get isWalletConnect() {
        return true;
    }

    get session() {
        return this.signer.session;
    }

    // ---------- Protected --------------------------------------------- //

    protected registerEventListeners() {
        this.signer.on("session_event", (payload: SignClientTypes.EventArguments["session_event"]) => {
            const { params } = payload;
            const { event } = params;
            if (event.name === "accountsChanged") {
                this.accounts = this.parseAccounts(event.data);
                this.events.emit("accountsChanged", this.accounts);
            } else if (event.name === "chainChanged") {
                this.setChainId(this.formatChainId(event.data));
            } else {
                this.events.emit(event.name as any, event.data);
            }
            this.events.emit("session_event", payload);
        });

        this.signer.on("chainChanged", (chainId: string) => {
            const chain = parseInt(chainId);
            this.chainId = chain;
            this.events.emit("chainChanged", toHexChainId(this.chainId));
            this.persist();
        });

        this.signer.on(
            "session_update",
            (payload: SignClientTypes.EventArguments["session_update"]) => {
                this.events.emit("session_update", payload);
            },
        );

        this.signer.on(
            "session_delete",
            (payload: SignClientTypes.EventArguments["session_delete"]) => {
                this.reset();
                this.events.emit("session_delete", payload);
                this.events.emit("disconnect", {
                    ...getSdkError("USER_DISCONNECTED"),
                    data: payload.topic,
                    name: "USER_DISCONNECTED",
                });
            },
        );

        this.signer.on("display_uri", (uri: string) => {
            if (this.rpc.showQrModal) {
                // to refresh the QR we have to close the modal and open it again
                // until proper API is provided by walletconnect modal
                this.modal?.closeModal();
                this.modal?.openModal({ uri });
            }
            this.events.emit("display_uri", uri);
        });
    }

    protected switchEthereumChain(chainId: number): void {
        this.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainId.toString(16) }],
        });
    }

    protected isCompatibleChainId(chainId: string): boolean {
        return typeof chainId === "string" ? chainId.startsWith(`${this.namespace}:`) : false;
    }

    protected formatChainId(chainId: number): string {
        return `${this.namespace}:${chainId}`;
    }

    protected parseChainId(chainId: string): number {
        return Number(chainId.split(":")[1]);
    }

    protected setChainIds(chains: string[]) {
        const compatible = chains.filter((x) => this.isCompatibleChainId(x));
        const chainIds = compatible.map((c) => this.parseChainId(c));
        if (chainIds.length) {
            this.chainId = chainIds[0];
            this.events.emit("chainChanged", toHexChainId(this.chainId));
            this.persist();
        }
    }

    protected setChainId(chain: string) {
        if (this.isCompatibleChainId(chain)) {
            const chainId = this.parseChainId(chain);
            this.chainId = chainId;
            this.switchEthereumChain(chainId);
        }
    }

    protected parseAccountId(account: string): { chainId: string; address: string } {
        const [namespace, reference, address] = account.split(":");
        const chainId = `${namespace}:${reference}`;
        return { chainId, address };
    }

    protected setAccounts(accounts: string[]) {
        this.accounts = accounts
            .filter((x) => this.parseChainId(this.parseAccountId(x).chainId) === this.chainId)
            .map((x) => this.parseAccountId(x).address);
        this.events.emit("accountsChanged", this.accounts);
    }

    protected getRpcConfig(opts: EthereumProviderOptions): EthereumRpcConfig {
        const requiredChains = opts?.chains ?? [];
        const optionalChains = opts?.optionalChains ?? [];
        const allChains = requiredChains.concat(optionalChains);
        if (!allChains.length)
            throw new Error("No chains specified in either `chains` or `optionalChains`");
        const requiredMethods = requiredChains.length ? opts?.methods || REQUIRED_METHODS : [];
        const requiredEvents = requiredChains.length ? opts?.events || REQUIRED_EVENTS : [];
        const optionalMethods = opts?.optionalMethods || [];
        const optionalEvents = opts?.optionalEvents || [];
        const rpcMap = opts?.rpcMap || this.buildRpcMap(allChains, opts.projectId);
        const qrModalOptions = opts?.qrModalOptions || undefined;
        return {
            chains: requiredChains?.map((chain) => this.formatChainId(chain)),
            optionalChains: optionalChains.map((chain) => this.formatChainId(chain)),
            methods: requiredMethods,
            events: requiredEvents,
            optionalMethods,
            optionalEvents,
            rpcMap,
            showQrModal: Boolean(opts?.showQrModal),
            qrModalOptions,
            projectId: opts.projectId,
            metadata: opts.metadata,
        };
    }

    protected buildRpcMap(chains: number[], projectId: string): EthereumRpcMap {
        const map: EthereumRpcMap = {};
        chains.forEach((chain) => {
            map[chain] = this.getRpcUrl(chain, projectId);
        });
        return map;
    }

    protected async initialize(opts: EthereumProviderOptions) {
        this.rpc = this.getRpcConfig(opts);

        this.chainId = this.rpc.chains.length
            ? getEthereumChainId(this.rpc.chains)
            : getEthereumChainId(this.rpc.optionalChains);
        this.signer = await UniversalProvider.init({
            projectId: this.rpc.projectId,
            metadata: this.rpc.metadata,
            disableProviderPing: opts.disableProviderPing,
            relayUrl: opts.relayUrl,
            storageOptions: opts.storageOptions,
            customStoragePrefix: opts.customStoragePrefix,
            telemetryEnabled: opts.telemetryEnabled,
        });
        this.registerEventListeners();
        await this.loadPersistedSession();
        if (this.rpc.showQrModal) {
            let WalletConnectModalClass;
            try {
                const { WalletConnectModal } = await import("@walletconnect/modal");
                WalletConnectModalClass = WalletConnectModal;
            } catch {
                throw new Error("To use QR modal, please install @walletconnect/modal package");
            }
            if (WalletConnectModalClass) {
                try {
                    this.modal = new WalletConnectModalClass({
                        projectId: this.rpc.projectId,
                        ...this.rpc.qrModalOptions,
                    });
                } catch (e) {
                    this.signer.logger.error(e);
                    throw new Error("Could not generate WalletConnectModal Instance");
                }
            }
        }
    }

    protected loadConnectOpts(opts?: ConnectOps) {
        if (!opts) return;
        const { chains, optionalChains, rpcMap } = opts;
        if (chains && isValidArray(chains)) {
            this.rpc.chains = chains.map((chain) => this.formatChainId(chain));
            chains.forEach((chain) => {
                this.rpc.rpcMap[chain] = rpcMap?.[chain] || this.getRpcUrl(chain);
            });
        }
        if (optionalChains && isValidArray(optionalChains)) {
            this.rpc.optionalChains = [];
            this.rpc.optionalChains = optionalChains?.map((chain) => this.formatChainId(chain));
            optionalChains.forEach((chain) => {
                this.rpc.rpcMap[chain] = rpcMap?.[chain] || this.getRpcUrl(chain);
            });
        }
    }

    protected getRpcUrl(chainId: number, projectId?: string): string {
        const providedRpc = this.rpc.rpcMap?.[chainId];
        return (
            providedRpc ||
            `${RPC_URL}?chainId=eip155:${chainId}&projectId=${projectId || this.rpc.projectId}`
        );
    }

    protected async loadPersistedSession() {
        if (!this.session) return;
        try {
            const chainId = await this.signer.client.core.storage.getItem(`${this.STORAGE_KEY}/chainId`);

            // cater to both inline & nested namespace formats
            const namespace = this.session.namespaces[`${this.namespace}:${chainId}`]
                ? this.session.namespaces[`${this.namespace}:${chainId}`]
                : this.session.namespaces[this.namespace];

            this.setChainIds(chainId ? [this.formatChainId(chainId)] : namespace?.accounts);
            this.setAccounts(namespace?.accounts);
        } catch (error) {
            this.signer.logger.error("Failed to load persisted session, clearing state...");
            this.signer.logger.error(error);
            await this.disconnect().catch((error) => this.signer.logger.warn(error));
        }
    }

    protected reset() {
        this.chainId = 1;
        this.accounts = [];
    }

    protected persist() {
        if (!this.session) return;
        this.signer.client.core.storage.setItem(`${this.STORAGE_KEY}/chainId`, this.chainId);
    }

    protected parseAccounts(payload: string | string[]): string[] {
        if (typeof payload === "string" || payload instanceof String) {
            return [this.parseAccount(payload)];
        }
        return payload.map((account: string) => this.parseAccount(account));
    }

    protected parseAccount = (payload: any): string => {
        return this.isCompatibleChainId(payload) ? this.parseAccountId(payload).address : payload;
    };
}

//Types
export type LSConnector = Connector & {
    resolveURI?: (uri: string) => string
    order?: number,
    isAvailable?: boolean,
    deepLink?: string,
}

export interface ProviderRpcError extends Error {
    message: string;
    code: number;
    data?: unknown;
}

export interface ProviderMessage {
    type: string;
    data: unknown;
}

export interface ProviderInfo {
    chainId: string;
}

export interface RequestArguments {
    method: string;
    params?: unknown[] | object;
}

export type ProviderChainId = ProviderInfo["chainId"];

export type ProviderAccounts = string[];

export interface EIP1102Request extends RequestArguments {
    method: "eth_requestAccounts";
}

export declare namespace IProviderEvents {
    type Event =
        | "connect"
        | "disconnect"
        | "message"
        | "chainChanged"
        | "accountsChanged"
        | "session_delete"
        | "session_event"
        | "session_update"
        | "display_uri";

    interface EventArguments {
        connect: ProviderInfo;
        disconnect: ProviderRpcError;
        message: ProviderMessage;
        chainChanged: ProviderChainId;
        accountsChanged: ProviderAccounts;
        session_delete: { topic: string };
        session_event: SignClientTypes.EventArguments["session_event"];
        session_update: SignClientTypes.EventArguments["session_delete"];
        display_uri: string;
    }
}
export interface IEthereumProviderEvents {
    on: <E extends IProviderEvents.Event>(
        event: E,
        listener: (args: IProviderEvents.EventArguments[E]) => void,
    ) => EthereumProvider;

    once: <E extends IProviderEvents.Event>(
        event: E,
        listener: (args: IProviderEvents.EventArguments[E]) => void,
    ) => EthereumProvider;

    off: <E extends IProviderEvents.Event>(
        event: E,
        listener: (args: IProviderEvents.EventArguments[E]) => void,
    ) => EthereumProvider;

    removeListener: <E extends IProviderEvents.Event>(
        event: E,
        listener: (args: IProviderEvents.EventArguments[E]) => void,
    ) => EthereumProvider;

    emit: <E extends IProviderEvents.Event>(
        event: E,
        payload: IProviderEvents.EventArguments[E],
    ) => boolean;
}

export interface EIP1193Provider {
    // connection event
    on(event: "connect", listener: (info: ProviderInfo) => void): EthereumProvider;
    // disconnection event
    on(event: "disconnect", listener: (error: ProviderRpcError) => void): EthereumProvider;
    // arbitrary messages
    on(event: "message", listener: (message: ProviderMessage) => void): EthereumProvider;
    // chain changed event
    on(event: "chainChanged", listener: (chainId: ProviderChainId) => void): EthereumProvider;
    // accounts changed event
    on(event: "accountsChanged", listener: (accounts: ProviderAccounts) => void): EthereumProvider;
    // make an Ethereum RPC method call.
    request(args: RequestArguments): Promise<unknown>;
}

export interface IProvider extends EIP1193Provider {
    // legacy alias for EIP-1102
    enable(): Promise<ProviderAccounts>;
}

export interface MobileWallet {
    id: string;
    name: string;
    links: {
        native: string;
        universal?: string;
    };
}
export interface DesktopWallet {
    id: string;
    name: string;
    links: {
        native: string;
        universal: string;
    };
}
export interface Chain {
    id: number;
    name: string;
}
export interface ConfigCtrlState {
    projectId: string;
    walletConnectVersion?: 1 | 2;
    standaloneChains?: string[];
    defaultChain?: Chain;
    mobileWallets?: MobileWallet[];
    desktopWallets?: DesktopWallet[];
    walletImages?: Record<string, string>;
    chainImages?: Record<string, string>;
    tokenImages?: Record<string, string>;
    tokenContracts?: Record<number, string>;
    enableAuthMode?: boolean;
    enableNetworkView?: boolean;
    enableAccountView?: boolean;
    enableExplorer?: boolean;
    explorerRecommendedWalletIds?: string[] | "NONE";
    explorerExcludedWalletIds?: string[] | "ALL";
    termsOfServiceUrl?: string;
    privacyPolicyUrl?: string;
}

export interface ThemeCtrlState {
    themeVariables?: {
        "--wcm-z-index"?: string;
        "--wcm-accent-color"?: string;
        "--wcm-accent-fill-color"?: string;
        "--wcm-background-color"?: string;
        "--wcm-background-border-radius"?: string;
        "--wcm-container-border-radius"?: string;
        "--wcm-wallet-icon-border-radius"?: string;
        "--wcm-wallet-icon-large-border-radius"?: string;
        "--wcm-wallet-icon-small-border-radius"?: string;
        "--wcm-input-border-radius"?: string;
        "--wcm-notification-border-radius"?: string;
        "--wcm-button-border-radius"?: string;
        "--wcm-secondary-button-border-radius"?: string;
        "--wcm-icon-button-border-radius"?: string;
        "--wcm-button-hover-highlight-border-radius"?: string;
        "--wcm-font-family"?: string;
        "--wcm-font-feature-settings"?: string;
        "--wcm-text-big-bold-size"?: string;
        "--wcm-text-big-bold-weight"?: string;
        "--wcm-text-big-bold-line-height"?: string;
        "--wcm-text-big-bold-letter-spacing"?: string;
        "--wcm-text-big-bold-text-transform"?: string;
        "--wcm-text-big-bold-font-family"?: string;
        "--wcm-text-medium-regular-size"?: string;
        "--wcm-text-medium-regular-weight"?: string;
        "--wcm-text-medium-regular-line-height"?: string;
        "--wcm-text-medium-regular-letter-spacing"?: string;
        "--wcm-text-medium-regular-text-transform"?: string;
        "--wcm-text-medium-regular-font-family"?: string;
        "--wcm-text-small-regular-size"?: string;
        "--wcm-text-small-regular-weight"?: string;
        "--wcm-text-small-regular-line-height"?: string;
        "--wcm-text-small-regular-letter-spacing"?: string;
        "--wcm-text-small-regular-text-transform"?: string;
        "--wcm-text-small-regular-font-family"?: string;
        "--wcm-text-small-thin-size"?: string;
        "--wcm-text-small-thin-weight"?: string;
        "--wcm-text-small-thin-line-height"?: string;
        "--wcm-text-small-thin-letter-spacing"?: string;
        "--wcm-text-small-thin-text-transform"?: string;
        "--wcm-text-small-thin-font-family"?: string;
        "--wcm-text-xsmall-bold-size"?: string;
        "--wcm-text-xsmall-bold-weight"?: string;
        "--wcm-text-xsmall-bold-line-height"?: string;
        "--wcm-text-xsmall-bold-letter-spacing"?: string;
        "--wcm-text-xsmall-bold-text-transform"?: string;
        "--wcm-text-xsmall-bold-font-family"?: string;
        "--wcm-text-xsmall-regular-size"?: string;
        "--wcm-text-xsmall-regular-weight"?: string;
        "--wcm-text-xsmall-regular-line-height"?: string;
        "--wcm-text-xsmall-regular-letter-spacing"?: string;
        "--wcm-text-xsmall-regular-text-transform"?: string;
        "--wcm-text-xsmall-regular-font-family"?: string;
        "--wcm-overlay-background-color"?: string;
        "--wcm-overlay-backdrop-filter"?: string;
    };
    themeMode?: "dark" | "light";
}

export type WalletConnectModalConfig = ConfigCtrlState &
    ThemeCtrlState & {
        projectId: string;
        chains?: string[];
        mobileWallets?: MobileWallet[];
        desktopWallets?: DesktopWallet[];
        walletImages?: Record<string, string>;
        enableAuthMode?: boolean;
        enableExplorer?: boolean;
        explorerRecommendedWalletIds?: string[] | "NONE";
        explorerExcludedWalletIds?: string[] | "ALL";
        termsOfServiceUrl?: string;
        privacyPolicyUrl?: string;
    };

export type QrModalOptions = Pick<
    WalletConnectModalConfig,
    | "themeMode"
    | "themeVariables"
    | "desktopWallets"
    | "enableExplorer"
    | "explorerRecommendedWalletIds"
    | "explorerExcludedWalletIds"
    | "mobileWallets"
    | "privacyPolicyUrl"
    | "termsOfServiceUrl"
    | "walletImages"
>;

import type { Connector, CreateConnectorFn } from 'wagmi';
import type { WalletConnectParameters } from '@wagmi/connectors';
export type InstructionStepName =
    | 'install'
    | 'create'
    | 'scan'
    | 'connect'
    | 'refresh';

type RainbowKitConnector = {
    mobile?: {
        getUri?: (uri: string) => string;
    };
    desktop?: {
        getUri?: (uri: string) => string;
        instructions?: {
            learnMoreUrl: string;
            steps: {
                step: InstructionStepName;
                title: string;
                description: string;
            }[];
        };
    };
    qrCode?: {
        getUri: (uri: string) => string;
        instructions?: {
            learnMoreUrl: string;
            steps: {
                step: InstructionStepName;
                title: string;
                description: string;
            }[];
        };
    };
    extension?: {
        instructions?: {
            learnMoreUrl: string;
            steps: {
                step: InstructionStepName;
                title: string;
                description: string;
            }[];
        };
    };
};

export type Wallet = {
    id: string;
    name: string;
    rdns?: string;
    shortName?: string;
    iconUrl: string | (() => Promise<string>);
    iconAccent?: string;
    iconBackground: string;
    installed?: boolean;
    downloadUrls?: {
        android?: string;
        ios?: string;
        mobile?: string;
        qrCode?: string;
        chrome?: string;
        edge?: string;
        firefox?: string;
        opera?: string;
        safari?: string;
        browserExtension?: string;
        macos?: string;
        windows?: string;
        linux?: string;
        desktop?: string;
    };
    hidden?: () => boolean;
    createConnector: (walletDetails: WalletDetailsParams) => CreateConnectorFn;
} & RainbowKitConnector;

export interface DefaultWalletOptions {
    projectId: string;
    walletConnectParameters?: RainbowKitWalletConnectParameters;
}

// We don't want users to pass in `showQrModal` or `projectId`.
// Those two values are handled by rainbowkit. The rest of WalletConnect
// parameters can be passed with no issue
export type RainbowKitWalletConnectParameters = Omit<
    WalletConnectParameters,
    'showQrModal' | 'projectId'
>;

export type RainbowKitDetails = Omit<Wallet, 'createConnector' | 'hidden'> & {
    index: number;
    groupIndex: number;
    groupName: string;
    isWalletConnectModalConnector?: boolean;
    isRainbowKitConnector: boolean;
    walletConnectModalConnector?: Connector;
    // Used specifically in `connectorsForWallets` logic
    // to make sure we can also get WalletConnect modal in rainbowkit
    showQrModal?: true;
};

export type WalletDetailsParams = { id: string, name: string };

export type CreateConnector = (walletDetails: WalletDetailsParams) => CreateConnectorFn;

// This is the default connector you get at first from wagmi
// "Connector" + rainbowkit details we inject into the connector
export type WagmiConnectorInstance = Connector & {
    // this is optional since we only get
    // rkDetails if we use rainbowkit connectors
    rkDetails?: RainbowKitDetails;
};

// This will be the wallet instance we will return
// in the rainbowkit connect modal
export type WalletInstance = Connector & RainbowKitDetails;

/** Combines members of an intersection into a readable type. */
export type Evaluate<type> = { [key in keyof type]: type[key] } & unknown;

/** Removes `readonly` from all properties of an object. */
export type Mutable<type extends object> = {
    -readonly [key in keyof type]: type[key];
};

/** Strict version of built-in Omit type */
export type Omit<type, keys extends keyof type> = Pick<
    type,
    Exclude<keyof type, keys>
>;

// window.ethereum types

export type WalletProviderFlags =
    | 'isApexWallet'
    | 'isAvalanche'
    | 'isBackpack'
    | 'isBifrost'
    | 'isBitKeep'
    | 'isBitski'
    | 'isBlockWallet'
    | 'isBraveWallet'
    | 'isCoinbaseWallet'
    | 'isDawn'
    | 'isEnkrypt'
    | 'isExodus'
    | 'isFrame'
    | 'isFrontier'
    | 'isGamestop'
    | 'isHyperPay'
    | 'isImToken'
    | 'isKuCoinWallet'
    | 'isMathWallet'
    | 'isMetaMask'
    | 'isNestWallet'
    | 'isOkxWallet'
    | 'isOKExWallet'
    | 'isOneInchAndroidWallet'
    | 'isOneInchIOSWallet'
    | 'isOpera'
    | 'isPhantom'
    | 'isPortal'
    | 'isRabby'
    | 'isRainbow'
    | 'isStatus'
    | 'isTally'
    | 'isTokenPocket'
    | 'isTokenary'
    | 'isTrust'
    | 'isTrustWallet'
    | 'isXDEFI'
    | 'isZerion'
    | 'isTalisman'
    | 'isZeal'
    | 'isCoin98'
    | 'isMEWwallet'
    | 'isSafeheron'
    | 'isSafePal'
    | '__seif';

export type WalletProvider = Evaluate<
    EIP1193Provider & {
        [key in WalletProviderFlags]?: true | undefined;
    } & {
        providers?: any[] | undefined;
        /** Only exists in MetaMask as of 2022/04/03 */
        _events?: { connect?: (() => void) | undefined } | undefined;
        /** Only exists in MetaMask as of 2022/04/03 */
        _state?:
        | {
            accounts?: string[];
            initialized?: boolean;
            isConnected?: boolean;
            isPermanentlyDisconnected?: boolean;
            isUnlocked?: boolean;
        }
        | undefined;
    }
>;

export type WindowProvider = {
    coinbaseWalletExtension?: WalletProvider | undefined;
    ethereum?: WalletProvider | undefined;
    phantom?: { ethereum: WalletProvider } | undefined;
    providers?: any[] | undefined; // Adjust the type as needed
};


export default EthereumProvider;


