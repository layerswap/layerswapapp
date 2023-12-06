import { WalletName } from "@solana/wallet-adapter-base";
import { useWalletMultiButton } from "./useWalletMultiButton";
import { Wallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
require("@solana/wallet-adapter-react-ui/styles.css");

export function SolanaModal() {
    const [walletModalConfig, setWalletModalConfig] = useState<Readonly<{
        onSelectWallet(walletName: WalletName): void;
        wallets: Wallet[];
    }> | null>(null);
    const { buttonState } =
        useWalletMultiButton({
            onSelectWallet: setWalletModalConfig,
        });
    let label: string = '';
    switch (buttonState) {
        case "connected":
            label = "Disconnect";
            break;
        case "connecting":
            label = "Connecting";
            break;
        case "disconnecting":
            label = "Disconnecting";
            break;
        case "has-wallet":
            label = "Connect";
            break;
        case "no-wallet":
            label = "Select Wallet";
            break;
    }

    return (
        <>
            {walletModalConfig ? (
                <div>
                    {walletModalConfig.wallets.map((wallet) => (
                        <button
                            key={wallet.adapter.name}
                            onClick={() => {
                                walletModalConfig.onSelectWallet(
                                    wallet.adapter.name
                                );
                                setWalletModalConfig(null);
                            }}
                        >
                            {wallet.adapter.name}
                        </button>
                    ))}
                </div>
            ) : null}
        </>
    );
}