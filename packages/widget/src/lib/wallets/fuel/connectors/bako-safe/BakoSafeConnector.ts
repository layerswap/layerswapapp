import {
  type Asset,
  type FuelABI,
  FuelConnector,
  FuelConnectorEventTypes,
  type Network,
  Provider,
  type StartConsolidateCoins,
  type StorageAbstract,
  type TransactionRequestLike,
} from 'fuels';

import { BakoStorage } from './BakoSafeStorage';
import { DAppWindow } from './DAPPWindow';
import { SocketClient } from './SocketClient';
import {
  APP_DESCRIPTION,
  APP_IMAGE_DARK,
  APP_IMAGE_LIGHT,
  APP_NAME,
  APP_NETWORK,
  APP_URL,
  APP_VERSION,
  HAS_WINDOW,
  HOST_URL,
  IS_SAFARI,
  SESSION_ID,
  WINDOW,
} from './constants';
import { RequestAPI } from './request';
import {
  type BakoSafeConnectorConfig,
  BakoSafeConnectorEvents,
  type IResponseAuthConfirmed,
  type IResponseTxCofirmed,
} from './types';

export class BakoSafeConnector extends FuelConnector {
  name = APP_NAME;
  metadata = {
    image: {
      light: APP_IMAGE_LIGHT,
      dark: APP_IMAGE_DARK,
    },
    install: {
      action: APP_URL,
      link: APP_URL,
      description: APP_DESCRIPTION,
    },
  };
  installed = !IS_SAFARI;
  connected = false;
  external = false;

  private readonly appUrl: string;
  private readonly host: string;
  private readonly api: RequestAPI;
  private setupReady?: boolean;
  private socket?: SocketClient;
  private sessionId?: string;
  private dAppWindow?: DAppWindow;
  private storage?: StorageAbstract;

  constructor(config?: BakoSafeConnectorConfig) {
    super();
    this.host = config?.host ?? HOST_URL;
    this.appUrl = config?.appUrl ?? APP_URL;
    this.api = config?.api ?? new RequestAPI(this.host);
    this.storage = this.getStorage(config?.storage);
    this.setupReady = false;
  }

  // ============================================================
  // Bako Safe application specific methods
  // ============================================================
  private getStorage(storage?: StorageAbstract) {
    const _storage = storage ?? WINDOW.localStorage ?? new BakoStorage();
    if (!_storage) {
      throw new Error('No storage provided');
    }

    return _storage;
  }

  private async getSessionId() {
    let sessionId: string = (await this.storage?.getItem(SESSION_ID)) || '';
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      await this.storage?.setItem(SESSION_ID, sessionId);
    }
    return sessionId;
  }

  private checkWindow() {
    // timeout to open
    const openInterval = setInterval(() => {
      const isOpen = this.dAppWindow?.isOpen;
      if (!isOpen) {
        this.emit(BakoSafeConnectorEvents.CLIENT_DISCONNECTED, {});
        clearInterval(openInterval);
      }
    }, 2000);

    // timeout to close
    const interval = setInterval(() => {
      const isOpen = this.dAppWindow?.opned?.closed;
      if (isOpen) {
        this.emit(BakoSafeConnectorEvents.CLIENT_DISCONNECTED, {});
        clearInterval(interval);
      }
    }, 300);
  }

  /**
   * [important]
   * this.socket.emit -> emit message to the server
   * this.emit -> emit message to the dApp client
   */

  private async setup() {
    if (!HAS_WINDOW) return;
    if (this.socket) this.socket.checkConnection();
    if (this.setupReady) return;

    this.setupReady = true;

    const sessionId = await this.getSessionId();
    this.sessionId = sessionId;

    this.socket = SocketClient.create({
      sessionId,
      events: this,
    });

    this.dAppWindow = new DAppWindow({
      sessionId,
      height: 800,
      width: 450,
      appUrl: this.appUrl,
      request_id: this.socket.request_id,
    });

    await this.requestConnectionState();
  }

  private async requestConnectionState() {
    return new Promise<void>((resolve) => {
      if (!this.socket) return;

      this.socket.server.emit(BakoSafeConnectorEvents.CONNECTION_STATE);

      this.socket.server.once(
        BakoSafeConnectorEvents.CONNECTION_STATE,
        async ({ data }: { data: boolean }) => {
          this.connected = data;
          this.emit(this.events.connection, data);
          resolve();
        },
      );
    });
  }

  // ============================================================
  // Connector methods
  // ============================================================
  async connect() {
    await this.setup();

    return new Promise<boolean>((resolve, reject) => {
      if (this.connected) {
        resolve(true);
        return;
      }

      this.dAppWindow?.open('/', reject);
      this.checkWindow();

      this.once(BakoSafeConnectorEvents.CLIENT_DISCONNECTED, () => {
        this.dAppWindow?.close();
        reject(false);
      });

      this.once(
        BakoSafeConnectorEvents.AUTH_CONFIRMED,
        async ({ data }: { data: IResponseAuthConfirmed }) => {
          await this.requestConnectionState();

          this.emit(this.events.accounts, await this.accounts());
          this.emit(this.events.currentAccount, await this.currentAccount());

          this.dAppWindow?.close();
          resolve(data.connected);
        },
      );
    });
  }

  /*
   * @param {string} address - The address to sign the transaction
   * @param {Transaction} transaction - The transaction to send
   *
   * @returns {string} - The transaction id
   */
  async sendTransaction(
    _address: string,
    _transaction: TransactionRequestLike,
  ) {
    return new Promise<string>((resolve, reject) => {
      this.dAppWindow?.open('/dapp/transaction', reject);
      this.checkWindow();

      const onClientConnected = () => {
        this.socket?.server.emit(BakoSafeConnectorEvents.TX_PENDING, {
          _transaction,
          _address,
        });
      };

      // @ts-ignore
      this.on(BakoSafeConnectorEvents.CLIENT_CONNECTED, onClientConnected);

      this.once(BakoSafeConnectorEvents.CLIENT_DISCONNECTED, () => {
        this.dAppWindow?.close();
        this.removeListener(
          BakoSafeConnectorEvents.CLIENT_CONNECTED,
          onClientConnected,
        );
        reject(new Error('Client disconnected'));
      });

      this.once(BakoSafeConnectorEvents.TX_TIMEOUT, () => {
        this.dAppWindow?.close();
        this.removeListener(
          BakoSafeConnectorEvents.CLIENT_CONNECTED,
          onClientConnected,
        );
        reject(new Error('Transaction timeout'));
      });

      this.once(
        BakoSafeConnectorEvents.TX_CONFIRMED,
        ({ data }: { data: IResponseTxCofirmed }) => {
          this.removeListener(
            BakoSafeConnectorEvents.CLIENT_CONNECTED,
            onClientConnected,
          );
          resolve(`0x${data.id}`);
        },
      );
    });
  }

  async selectNetwork(_network: Network): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.dAppWindow?.open('/dapp/network', reject);
      this.checkWindow();

      const onClientConnected = () => {
        this.socket?.server.emit(BakoSafeConnectorEvents.CHANGE_NETWORK, {
          _network,
        });
      };

      // @ts-ignore
      this.on(BakoSafeConnectorEvents.CLIENT_CONNECTED, onClientConnected);

      this.once(BakoSafeConnectorEvents.CLIENT_DISCONNECTED, () => {
        this.dAppWindow?.close();
        this.removeListener(
          BakoSafeConnectorEvents.CLIENT_CONNECTED,
          onClientConnected,
        );
        reject(new Error('Client disconnected'));
      });

      this.once(BakoSafeConnectorEvents.NETWORK_CHANGED, async () => {
        const network = await this.currentNetwork();

        this.emit(this.events.networks, [network]);
        this.emit(this.events.currentNetwork, network);

        this.dAppWindow?.close();
        this.removeListener(
          BakoSafeConnectorEvents.CLIENT_CONNECTED,
          onClientConnected,
        );

        resolve(true);
      });
    });
  }

  async ping() {
    if (IS_SAFARI) {
      return false;
    }
    await this.setup();
    return this.setupReady ?? false;
  }

  async version() {
    return {
      app: APP_VERSION,
      network: APP_NETWORK,
    };
  }

  async isConnected() {
    await this.setup();
    return this.connected;
  }

  async accounts() {
    const data = await this.api.get(`/connections/${this.sessionId}/accounts`);

    const acc = Array.isArray(data) ? data : [];
    return acc;
  }

  async currentAccount() {
    const data = await this.api.get(
      `/connections/${this.sessionId}/currentAccount`,
    );

    const isInvalid = data && JSON.stringify(data) === JSON.stringify({});

    return isInvalid ? null : data;
  }

  async disconnect() {
    await this.api.delete(`/connections/${this.sessionId}`);
    await this.requestConnectionState();
    this.emit(this.events.accounts, []);
    this.emit(this.events.currentAccount, null);
    return false;
  }

  async currentNetwork(): Promise<Network> {
    const data = await this.api.get(
      `/connections/${this.sessionId}/currentNetwork`,
    );

    const provider = new Provider(data);

    return {
      url: provider.url,
      chainId: await provider.getChainId(),
    };
  }

  async networks(): Promise<Array<Network>> {
    return [await this.currentNetwork()];
  }

  async assets(): Promise<Asset[]> {
    return [];
  }

  async signMessage(_address: string, _message: string): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async addAssets(_assets: Asset[]): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async addAsset(_assets: Asset): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async addNetwork(_networkUrl: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async addABI(_contractId: string, _abi: FuelABI): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async getABI(_id: string): Promise<FuelABI | null> {
    throw new Error('Method not implemented.');
  }

  async hasABI(_id: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  /**
   * @inheritdoc
   */
  async startConsolidation(opts: StartConsolidateCoins): Promise<void> {
    this.emit(FuelConnectorEventTypes.consolidateCoins, opts);
  }
}
