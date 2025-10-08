import { SelectAccountProps, WalletConnectionProvider } from "@/lib/wallets/types/wallet";

export function SwitchWalletAccount(props: SelectAccountProps, provider: WalletConnectionProvider | undefined) {
    const { walletId, address, providerName } = props;

    if (!provider || !provider.connectedWallets) {
        throw new Error("Provider or connected wallets not available.");
    }

    const wallet = provider.connectedWallets.find(c => c.id === walletId);
    if (!wallet) {
        throw new Error(`Wallet with id ${walletId} not found in connected wallets.`);
    }
    if (provider.switchAccount) {
        provider.switchAccount(wallet, address);
    } else {
        throw new Error(`Switch account method not implemented for provider ${providerName}.`);
    }
}