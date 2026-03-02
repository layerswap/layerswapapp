import { InternalConnector } from "./WalletProvider";

export type WalletConnectWallet = {
    id: string;
    name: string;
    mobile: {
        native?: boolean;
        universal?: boolean;
    };
    desktop?: {
        native?: boolean;
        universal?: boolean;
    };
    rdns?: string;
    hasBrowserExtension?: boolean;
    extensionNotFound: boolean;
    type: string;
    icon: string;
    projectId: string;
    showQrModal: boolean;
    customStoragePrefix: string;
} & InternalConnector;
