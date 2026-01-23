import { FC, ReactNode, useEffect, useState } from "react";
import { mainnet, sepolia } from "@starknet-react/chains"
import { Connector, ConnectorNotConnectedError, UserNotConnectedError, StarknetConfig, publicProvider, useConnect, useDisconnect } from '@starknet-react/core';
import { WalletConnectConfig } from "./index";
import { KnownInternalNames, useSettingsState } from "@layerswap/widget/internal";
//@ts-ignore
import { ArgentMobileConnector } from "starknetkit/argentMobile"
// @ts-ignore
import { InjectedConnector } from "starknetkit/injected"
// @ts-ignore
import { WebWalletConnector } from "starknetkit/webwallet"
// @ts-ignore
import { ControllerConnector } from "starknetkit/controller"
import { RpcMessage, RequestFnCall, RpcTypeToMessageMap } from "@starknet-io/types-js";
import useStarknetConnection, { resolveStarknetWallet } from "./useStarknetConnection";
import { useStarknetStore } from "./starknetWalletStore";

type StarknetProviderProps = {
    children: ReactNode
    walletConnectConfigs?: WalletConnectConfig
}

class DiscoveryConnector extends Connector {
    #wallet;
    #store;

    constructor(wallet, store) {
        super();
        this.#wallet = wallet;
        this.#store = store;
    }

    get id() {
        return `${this.#wallet.id}-mobile`;
    }

    get icon() {
        return {
            dark: this.#wallet.icon,
            light: this.#wallet.icon
        };
    }

    get name() {
        return `${this.#wallet.name} (mobile)`;
    }

    available() {
        return true;
    }

    connect(): any {
        window.open(this.#wallet.downloads[this.#store], "_blank");
        return undefined
    }

    get wallet() {
        throw new ConnectorNotConnectedError()
    }

    disconnect(): any {
        throw new UserNotConnectedError()
    }

    account(): any {
        throw new ConnectorNotConnectedError()
    }
    ready(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    chainId(): Promise<bigint> {
        throw new Error("Method not implemented.");
    }
    request<T extends RpcMessage["type"]>(call: RequestFnCall<T>): Promise<RpcTypeToMessageMap[T]["result"]> {
        throw new Error("Method not implemented.");
    }

}


const StarknetProvider: FC<StarknetProviderProps> = ({ children, walletConnectConfigs }) => {
    const [connectors, setConnectors] = useState<any[]>([])

    const walletConnectConfig = walletConnectConfigs
    const WALLETCONNECT_PROJECT_ID = walletConnectConfig?.projectId

    const resolveConnectors = async () => {

        const isSafari =
            typeof window !== "undefined"
                ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
                : false
        const isAndroid = navigator.userAgent.match(/Android/i);
        const isIOS = navigator.userAgent.match(/iPhone|iPad|iPod/i);

        const defaultConnectors: any[] = []

        if (!isSafari) {
            if (!(isAndroid || isIOS)) {
                defaultConnectors.push(
                    new InjectedConnector({ options: { id: "argentX" } }),
                )
                defaultConnectors.push(
                    new InjectedConnector({ options: { id: "keplr" } }),
                )
            }
            defaultConnectors.push(
                new InjectedConnector({ options: { id: "braavos" } }),
            )
            defaultConnectors.push(
                new InjectedConnector({ options: { id: "xverse" } }),
            )
        }

        if ((isAndroid || isIOS) && !defaultConnectors.some(c => c.id === "braavos")) {
            const starknet = (await import('@starknet-io/get-starknet-core')).default

            const discoverWallets = (await starknet.getDiscoveryWallets()).filter(w => {
                return (isAndroid && w.downloads["android"]) || (isIOS && w.downloads["ios"]);
            })

            if (discoverWallets.length) defaultConnectors.push(...discoverWallets.map(w => new DiscoveryConnector(w, isAndroid ? "android" : "ios")))
        }

        defaultConnectors.push(ArgentMobileConnector.init({
            options: {
                dappName: walletConnectConfig?.name || 'Layerswap',
                projectId: WALLETCONNECT_PROJECT_ID,
                url: walletConnectConfig?.url || 'https://www.layerswap.io/app/',
                description: walletConnectConfig?.description || 'Move crypto across exchanges, blockchains, and wallets.',
            }
        }))

        defaultConnectors.push(
            new ControllerConnector(),
        )

        defaultConnectors.push(new WebWalletConnector())

        return defaultConnectors
    }

    useEffect(() => {
        (async () => {
            const result = await resolveConnectors()
            setConnectors(result)
        })()
    }, [])

    const chains = [mainnet, sepolia]

    return (
        <StarknetConfig
            chains={chains}
            provider={publicProvider()}
            connectors={connectors}
        >
            <StarknetWalletInitializer />
            {children}
        </StarknetConfig>
    )
}

export default StarknetProvider;

const StarknetWalletInitializer = () => {
    const { connectors } = useConnect();
    const { disconnectAsync } = useDisconnect();
    const { networks } = useSettingsState();
    const starknetAccounts = useStarknetStore((state) => state.starknetAccounts) || {};
    const addWallet = useStarknetStore((state) => state.connectWallet);
    const removeAccount = useStarknetStore((state) => state.removeAccount);
    const { withdrawalSupportedNetworks, autofillSupportedNetworks, asSourceSupportedNetworks } = useStarknetConnection({ networks });
    const [connectorsReady, setConnectorsReady] = useState(false)

    useEffect(() => {
        if (connectors.length === 0 || connectorsReady || Object.keys(starknetAccounts).length == 0) return;

        const checkConnectorsReady = () => {
            const hasWallet = connectors.some(connector => {
                try {
                    const wallet = InjectedConnector.getInjectedWallet(connector.id);
                    return wallet !== null && wallet !== undefined;
                } catch {
                    return false;
                }
            });

            if (hasWallet) {
                setConnectorsReady(true);
            }
        };
        checkConnectorsReady();

        const interval = setInterval(checkConnectorsReady, 500);

        return () => clearInterval(interval);
    }, [connectors, connectorsReady, starknetAccounts])

    useEffect(() => {
        const initializeWallet = async () => {
            const starknetNetwork = networks.find(
                (n) =>
                    n.name === KnownInternalNames.Networks.StarkNetMainnet ||
                    n.name === KnownInternalNames.Networks.StarkNetSepolia
            );

            for (const connector of connectors) {
                const address = starknetAccounts[connector.id];
                if (address) {
                    const wallet = await resolveStarknetWallet({
                        name: "Starknet",
                        connector,
                        network: starknetNetwork,
                        disconnectWallets: () => disconnectAsync().then(() => removeAccount(address)),
                        withdrawalSupportedNetworks,
                        autofillSupportedNetworks,
                        asSourceSupportedNetworks,
                        address
                    });

                    if (wallet?.address) {
                        addWallet(wallet);
                    }
                }
            }
        };

        if (Object.keys(starknetAccounts).length && connectorsReady) {
            initializeWallet();
        }
    }, [connectors, networks, connectorsReady]);

    return <></>;
}
