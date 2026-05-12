import { InternalConnector } from "./WalletProvider";

export type WalletConnectWallet = {
    id: string;
    name: string;
    mobile: {
        native?: string | null;
        universal?: string | null;
    };
    desktop?: {
        native?: string | null;
        universal?: string | null;
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
