import { InternalConnector } from "@/types/wallet";

export type WalletConnectWallet = {
    id: string;
    name: string;
    shortName?:string;
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
