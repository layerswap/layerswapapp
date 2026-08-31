import type { WalletConnectConfig } from "..";

let _config: WalletConnectConfig | null = null

export function setWalletConnectConfig(config: WalletConnectConfig | undefined): void {
    _config = config ?? null
}

export function getWalletConnectConfig(): WalletConnectConfig | null {
    return _config
}
