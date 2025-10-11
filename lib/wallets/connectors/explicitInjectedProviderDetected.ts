
export function explicitInjectedProviderDetected() {
    const _window =
        typeof window !== 'undefined' ? (window as WindowProvider) : undefined;
    if (typeof _window === 'undefined' || typeof _window.ethereum === 'undefined')
        return false;
    return !!_window.ethereum;
}

export type Evaluate<type> = { [key in keyof type]: type[key] } & unknown;

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
