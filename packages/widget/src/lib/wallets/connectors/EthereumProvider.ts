import { isValidArray } from "@walletconnect/utils";
import { KeyValueStorageOptions } from "@walletconnect/keyvaluestorage";

import {
    Metadata,
    Namespace,
    UniversalProviderOpts,
} from "@walletconnect/universal-provider";
import { AuthTypes, SignClientTypes } from "@walletconnect/types";
import {
    REQUIRED_METHODS,
    REQUIRED_EVENTS,
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


