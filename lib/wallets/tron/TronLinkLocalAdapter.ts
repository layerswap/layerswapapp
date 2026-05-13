import {
    Adapter,
    AdapterState,
    isInBrowser,
    isInMobileBrowser,
    NetworkType,
    WalletConnectionError,
    WalletDisconnectedError,
    WalletGetNetworkError,
    WalletNotFoundError,
    WalletReadyState,
    WalletSignMessageError,
    WalletSignTransactionError,
    WalletSwitchChainError,
    type AdapterName,
    type Network,
    type SignedTransaction,
    type Transaction,
} from '@tronweb3/tronwallet-abstract-adapter';
import { openTronLink, waitTronwebReady } from '@tronweb3/tronwallet-adapter-tronlink';

const TronLinkIcon = '/images/tronlink.png';

type TronWalletLike = {
    ready?: boolean;
    tronWeb?: any;
    request: (config: Record<string, unknown>) => Promise<any>;
    on?: (event: string, cb: any) => void;
    removeListener?: (event: string, cb: any) => void;
    isTronLink?: boolean;
};

const isOwnedByAnotherWallet = (provider: unknown): boolean => {
    for (const key of Object.keys(window)) {
        if (key === 'tronLink' || key === 'tronWeb' || key === 'tron') continue;
        try {
            const ns = (window as Record<string, unknown>)[key];
            if (!ns || typeof ns !== 'object' || ns === window) continue;
            const candidate = ns as { tronLink?: unknown; tron?: unknown; tronWeb?: unknown };
            if (
                candidate.tronLink === provider ||
                candidate.tron === provider ||
                candidate.tronWeb === provider
            ) return true;
        } catch {
            // Cross-origin frames, getters that throw, etc. Skip silently.
        }
    }
    return false;
};

const supportTron = () =>
    !!(window.tron && (window.tron as any).isTronLink) &&
    !isOwnedByAnotherWallet(window.tron);

const supportTronLink = () =>
    supportTron() ||
    (!!window.tronLink && !isOwnedByAnotherWallet(window.tronLink)) ||
    (!!window.tronWeb && !isOwnedByAnotherWallet(window.tronWeb));

export const chainIdNetworkMap: Record<string, NetworkType> = {
    '0x2b6653dc': NetworkType.Mainnet,
    '0x94a9059e': NetworkType.Shasta,
    '0xcd8690dc': NetworkType.Nile,
};

async function getNetworkInfoByTronWeb(tronWeb: any): Promise<Network> {
    const { blockID = '' } = await tronWeb.trx.getBlockByNumber(0);
    const chainId = `0x${blockID.slice(-8)}`;
    return {
        networkType: chainIdNetworkMap[chainId] || NetworkType.Unknown,
        chainId,
        fullNode: tronWeb.fullNode?.host || '',
        solidityNode: tronWeb.solidityNode?.host || '',
        eventServer: tronWeb.eventServer?.host || '',
    };
}

export interface TronLinkLocalAdapterConfig {
    checkTimeout?: number;
    openTronLinkAppOnMobile?: boolean;
    openUrlWhenWalletNotFound?: boolean;
    dappIcon?: string;
    dappName?: string;
}

export class TronLinkLocalAdapter extends Adapter {
    name = 'TronLink' as AdapterName<'TronLink'>;
    url = 'https://www.tronlink.org/';
    icon = TronLinkIcon;

    private _readyState: WalletReadyState;
    private _state: AdapterState;
    private _connecting = false;
    private _wallet: TronWalletLike | null = null;
    private _address: string | null = null;
    private _supportNewTronProtocol = false;

    private config: Required<TronLinkLocalAdapterConfig>;
    private checkReadyInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: TronLinkLocalAdapterConfig = {}) {
        super();
        const {
            checkTimeout = 30 * 1000,
            dappIcon = '',
            dappName = '',
            openUrlWhenWalletNotFound = true,
            openTronLinkAppOnMobile = true,
        } = config;
        if (typeof checkTimeout !== 'number') {
            throw new Error('[TronLinkLocalAdapter] config.checkTimeout should be a number');
        }
        this.config = {
            checkTimeout,
            openTronLinkAppOnMobile,
            openUrlWhenWalletNotFound,
            dappIcon,
            dappName,
        };

        if (!isInBrowser()) {
            this._readyState = WalletReadyState.NotFound;
            this._state = AdapterState.NotFound;
            return;
        }

        if (supportTronLink() || (isInMobileBrowser() && (window.tronLink || window.tronWeb))) {
            this._readyState = WalletReadyState.Found;
            this._state = AdapterState.Disconnect;
            this._updateWallet();
            if (this.connected) {
                this.emit('connect', this.address || '');
            }
        } else {
            this._readyState = WalletReadyState.NotFound;
            this._state = AdapterState.NotFound;
        }
    }

    get address(): string | null {
        return this._address;
    }
    get state(): AdapterState {
        return this._state;
    }
    get readyState(): WalletReadyState {
        return this._readyState;
    }
    get connecting(): boolean {
        return this._connecting;
    }

    async network(): Promise<Network> {
        try {
            await this._checkWallet();
            if (this.state !== AdapterState.Connected) throw new WalletDisconnectedError();
            const tronWeb = this._wallet?.tronWeb || (window as any).tronWeb;
            if (!tronWeb) throw new WalletDisconnectedError();
            try {
                return await getNetworkInfoByTronWeb(tronWeb);
            } catch (e: any) {
                throw new WalletGetNetworkError(e?.message, e);
            }
        } catch (e: any) {
            this.emit('error', e);
            throw e;
        }
    }

    async connect(): Promise<void> {
        try {
            this.checkIfOpenTronLink();
            if (this.connected || this.connecting) return;
            await this._checkWallet();
            if (this.state === AdapterState.NotFound) {
                if (this.config.openUrlWhenWalletNotFound !== false && isInBrowser()) {
                    window.open(this.url, '_blank');
                }
                throw new WalletNotFoundError();
            }
            // lower version only support window.tronWeb, no window.tronLink
            if (!this._wallet) return;
            this._connecting = true;
            if (this._supportNewTronProtocol) {
                const wallet = this._wallet;
                try {
                    const res = (await wallet.request({ method: 'eth_requestAccounts' })) as string[];
                    const address = res[0];
                    this.setAddress(address);
                    this.setState(AdapterState.Connected);
                    this._listenTronEvent();
                    if (!this._wallet.tronWeb) {
                        await waitTronwebReady(this._wallet as any);
                    }
                } catch (error: any) {
                    let message = error?.message || error || 'Connect TronLink wallet failed.';
                    if (error?.code === -32002) {
                        message =
                            'The same DApp has already initiated a request to connect to TronLink wallet, and the pop-up window has not been closed.';
                    }
                    if (error?.code === 4001) {
                        message = 'The user rejected connection.';
                    }
                    throw new WalletConnectionError(message, error);
                }
            } else if (window.tronLink) {
                const wallet = this._wallet;
                try {
                    const res = await wallet.request({ method: 'tron_requestAccounts' });
                    if (!res) {
                        throw new WalletConnectionError(
                            'TronLink wallet is locked or no wallet account is avaliable.'
                        );
                    }
                    if (res.code === 4000) {
                        throw new WalletConnectionError(
                            'The same DApp has already initiated a request to connect to TronLink wallet, and the pop-up window has not been closed.'
                        );
                    }
                    if (res.code === 4001) {
                        throw new WalletConnectionError('The user rejected connection.');
                    }
                } catch (error: any) {
                    throw new WalletConnectionError(error?.message, error);
                }
                const address = wallet.tronWeb?.defaultAddress?.base58 || '';
                this.setAddress(address);
                this.setState(AdapterState.Connected);
                this._listenTronLinkEvent();
            } else if (window.tronWeb) {
                const wallet = this._wallet;
                const address = wallet.tronWeb?.defaultAddress?.base58 || '';
                this.setAddress(address);
                this.setState(AdapterState.Connected);
            } else {
                throw new WalletConnectionError('Cannot connect wallet.');
            }
            this.connected && this.emit('connect', this.address || '');
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        if (this._supportNewTronProtocol) {
            this._stopListenTronEvent();
        } else {
            this._stopListenTronLinkEvent();
        }
        if (this.state !== AdapterState.Connected) {
            return;
        }
        this.setAddress(null);
        this.setState(AdapterState.Disconnect);
        this.emit('disconnect');
    }

    async signTransaction(transaction: Transaction, privateKey?: string): Promise<SignedTransaction> {
        try {
            const wallet = await this.checkAndGetWallet();
            try {
                return await wallet.tronWeb.trx.sign(transaction, privateKey);
            } catch (error: any) {
                if (error instanceof Error) {
                    throw new WalletSignTransactionError(error.message, error);
                } else {
                    throw new WalletSignTransactionError(error, new Error(error));
                }
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async multiSign(
        transaction: Transaction,
        privateKey?: string | false,
        permissionId?: number
    ): Promise<SignedTransaction> {
        try {
            const wallet = await this.checkAndGetWallet();
            try {
                return await wallet.tronWeb.trx.multiSign(transaction, privateKey, permissionId);
            } catch (error: any) {
                if (error instanceof Error) {
                    throw new WalletSignTransactionError(error.message, error);
                } else {
                    throw new WalletSignTransactionError(error, new Error(error));
                }
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signMessage(message: string, privateKey?: string): Promise<string> {
        try {
            const wallet = await this.checkAndGetWallet();
            try {
                return await wallet.tronWeb.trx.signMessageV2(message, privateKey);
            } catch (error: any) {
                if (error instanceof Error) {
                    throw new WalletSignMessageError(error.message, error);
                } else {
                    throw new WalletSignMessageError(error, new Error(error));
                }
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async switchChain(chainId: string): Promise<void> {
        try {
            await this._checkWallet();
            if (this.state === AdapterState.NotFound) {
                if (this.config.openUrlWhenWalletNotFound !== false && isInBrowser()) {
                    window.open(this.url, '_blank');
                }
                throw new WalletNotFoundError();
            }
            if (!this._supportNewTronProtocol) {
                throw new WalletSwitchChainError(
                    "Current version of TronLink doesn't support switch chain operation."
                );
            }
            const wallet = this._wallet!;
            try {
                await wallet.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId }],
                });
            } catch (e: any) {
                throw new WalletSwitchChainError(e?.message || e, e instanceof Error ? e : new Error(e));
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    private async checkAndGetWallet(): Promise<TronWalletLike> {
        this.checkIfOpenTronLink();
        await this._checkWallet();
        if (this.state !== AdapterState.Connected) throw new WalletDisconnectedError();
        const wallet = this._wallet;
        if (!wallet || !wallet.tronWeb) throw new WalletDisconnectedError();
        return wallet;
    }

    private _tronLinkMessageHandler = (e: MessageEvent) => {
        const message = (e.data as any)?.message;
        if (!message) {
            return;
        }
        if (message.action === 'accountsChanged') {
            setTimeout(() => {
                const preAddr = this.address || '';
                if (this._wallet?.ready) {
                    const address = message.data.address;
                    this.setAddress(address);
                    this.setState(AdapterState.Connected);
                } else {
                    this.setAddress(null);
                    this.setState(AdapterState.Disconnect);
                }
                this.emit('accountsChanged', this.address || '', preAddr);
                if (!preAddr && this.address) {
                    this.emit('connect', this.address);
                } else if (preAddr && !this.address) {
                    this.emit('disconnect');
                }
            }, 200);
        } else if (message.action === 'setNode') {
            this.emit('chainChanged', { chainId: message.data?.node?.chainId || '' });
        } else if (message.action === 'connect') {
            const address = this._wallet?.tronWeb?.defaultAddress?.base58 || '';
            this.setAddress(address);
            this.setState(AdapterState.Connected);
            this.emit('connect', address);
        } else if (message.action === 'disconnect') {
            this.setAddress(null);
            this.setState(AdapterState.Disconnect);
            this.emit('disconnect');
        }
    };

    private _onChainChanged = (data: unknown) => {
        this.emit('chainChanged', data);
    };

    private _onAccountsChanged = () => {
        const preAddr = this.address || '';
        const curAddr =
            (this._wallet?.tronWeb && this._wallet.tronWeb.defaultAddress?.base58) || '';
        if (!curAddr) {
            this.setAddress(null);
            this.setState(AdapterState.Disconnect);
        } else {
            const address = curAddr;
            this.setAddress(address);
            this.setState(AdapterState.Connected);
        }
        this.emit('accountsChanged', this.address || '', preAddr);
        if (!preAddr && this.address) {
            this.emit('connect', this.address);
        } else if (preAddr && !this.address) {
            this.emit('disconnect');
        }
    };

    private _listenTronLinkEvent() {
        this._stopListenTronLinkEvent();
        window.addEventListener('message', this._tronLinkMessageHandler);
    }

    private _stopListenTronLinkEvent() {
        window.removeEventListener('message', this._tronLinkMessageHandler);
    }

    private _listenTronEvent() {
        this._stopListenTronEvent();
        this._stopListenTronLinkEvent();
        const wallet = this._wallet;
        wallet?.on?.('chainChanged', this._onChainChanged);
        wallet?.on?.('accountsChanged', this._onAccountsChanged);
    }

    private _stopListenTronEvent() {
        const wallet = this._wallet;
        wallet?.removeListener?.('chainChanged', this._onChainChanged);
        wallet?.removeListener?.('accountsChanged', this._onAccountsChanged);
    }

    private checkIfOpenTronLink() {
        const { dappName = '', dappIcon = '' } = this.config;
        if (this.config.openTronLinkAppOnMobile === false) {
            return;
        }
        if (openTronLink({ dappIcon, dappName })) {
            throw new WalletNotFoundError();
        }
    }

    private async _checkWallet(): Promise<boolean> {
        if (this.readyState === WalletReadyState.Found) return true;
        if (!isInBrowser()) return false;
        if (supportTronLink() || (isInMobileBrowser() && (window.tronLink || window.tronWeb))) {
            this._readyState = WalletReadyState.Found;
            this._updateWallet();
            this.emit('readyStateChanged', this.readyState);
            return true;
        }
        return false;
    }

    private _updateWallet = () => {
        let state = this.state;
        let address = this.address;
        if (isInMobileBrowser()) {
            if (window.tronLink) {
                this._wallet = window.tronLink as unknown as TronWalletLike;
            } else {
                this._wallet = {
                    ready: !!window.tronWeb?.defaultAddress,
                    tronWeb: window.tronWeb,
                    request: () => Promise.resolve(true),
                };
            }
            address = this._wallet.tronWeb?.defaultAddress?.base58 || null;
            state = address ? AdapterState.Connected : AdapterState.Disconnect;
        } else if (
            window.tron &&
            (window.tron as any).isTronLink &&
            !isOwnedByAnotherWallet(window.tron)
        ) {
            this._supportNewTronProtocol = true;
            this._wallet = window.tron as unknown as TronWalletLike;
            this._listenTronEvent();
            try {
                address =
                    (this._wallet?.tronWeb && this._wallet.tronWeb.defaultAddress?.base58) || null;
                state = address ? AdapterState.Connected : AdapterState.Disconnect;
            } catch (e) {
                console.error('Unknow error: ' + e, ' Please install TronLink extension wallet.');
                address = null;
                state = AdapterState.Disconnect;
                this._readyState = WalletReadyState.NotFound;
                this.emit('readyStateChanged', this.readyState);
                return;
            }
        } else if (window.tronLink && !isOwnedByAnotherWallet(window.tronLink)) {
            this._wallet = window.tronLink as unknown as TronWalletLike;
            this._listenTronLinkEvent();
            address = this._wallet.tronWeb?.defaultAddress?.base58 || null;
            state = this._wallet.ready ? AdapterState.Connected : AdapterState.Disconnect;
        } else if (window.tronWeb && !isOwnedByAnotherWallet(window.tronWeb)) {
            // fake tronLink
            this._wallet = {
                ready: window.tronWeb.ready,
                tronWeb: window.tronWeb,
                request: () => Promise.resolve(true),
            };
            address = this._wallet.tronWeb.defaultAddress?.base58 || null;
            state = this._wallet.ready ? AdapterState.Connected : AdapterState.Disconnect;
        } else {
            this._wallet = null;
            address = null;
            state = AdapterState.NotFound;
        }
        if (isInMobileBrowser() && state === AdapterState.Disconnect) {
            this.checkForWalletReadyForApp();
        }
        this.setAddress(address);
        this.setState(state);
    };

    private checkForWalletReadyForApp() {
        if (this.checkReadyInterval) {
            return;
        }
        let times = 0;
        const maxTimes = Math.floor(this.config.checkTimeout / 200);
        const check = () => {
            if (
                window.tronLink
                    ? window.tronLink.tronWeb?.defaultAddress
                    : window.tronWeb?.defaultAddress
            ) {
                this.checkReadyInterval && clearInterval(this.checkReadyInterval);
                this.checkReadyInterval = null;
                this._updateWallet();
                this.emit('connect', this.address || '');
            } else if (times > maxTimes) {
                this.checkReadyInterval && clearInterval(this.checkReadyInterval);
                this.checkReadyInterval = null;
            } else {
                times++;
            }
        };
        this.checkReadyInterval = setInterval(check, 200);
    }

    private setAddress(address: string | null) {
        this._address = address;
    }

    private setState(state: AdapterState) {
        const preState = this.state;
        if (state !== preState) {
            this._state = state;
            this.emit('stateChanged', state);
        }
    }
}
