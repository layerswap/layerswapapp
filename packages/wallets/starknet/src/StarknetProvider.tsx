import { FC, ReactNode, useEffect, useState } from "react";
import { mainnet, sepolia } from "@starknet-react/chains"
import { Connector, ConnectorNotConnectedError, UserNotConnectedError, StarknetConfig, publicProvider } from '@starknet-react/core';
import { RpcMessage, RequestFnCall, RpcTypeToMessageMap } from "@starknet-io/types-js";
import { useSettingsState } from "@layerswap/widget/internal";
import { StarknetSync } from "./service/syncStarknet";
import { starknetConnectionAdapter } from "./service/starknetConnectionAdapter";

const StarknetHydrator = () => {
    const { networks } = useSettingsState()
    return <starknetConnectionAdapter.Hydrator networks={networks} />
}

type StarknetProviderProps = {
    children: ReactNode
}

let getInjectedWalletById: ((id: string) => unknown) | undefined;

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


const StarknetProvider: FC<StarknetProviderProps> = ({ children }) => {
    const [connectors, setConnectors] = useState<any[]>([])

    const resolveConnectors = async () => {
        // @ts-ignore
        const injectedModule = await import("starknetkit/injected");
        // @ts-ignore
        const webWalletModule = await import("starknetkit/webwallet");
        // @ts-ignore
        const controllerModule = await import("starknetkit/controller");

        const InjectedConnector = (injectedModule as any).InjectedConnector;
        const WebWalletConnector = (webWalletModule as any).WebWalletConnector;
        const ControllerConnector = (controllerModule as any).ControllerConnector;
        getInjectedWalletById = InjectedConnector?.getInjectedWallet;

        const isSafari =
            typeof window !== "undefined"
                ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
                : false
        const isAndroid = navigator.userAgent.match(/Android/i);
        const isIOS = navigator.userAgent.match(/iPhone|iPad|iPod/i);

        const defaultConnectors: any[] = []

        if (!isSafari) {
            defaultConnectors.push(
                new InjectedConnector({ options: { id: "argentX" } }),
            )
            defaultConnectors.push(
                new InjectedConnector({ options: { id: "keplr" } }),
            )
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

        defaultConnectors.push(
            new ControllerConnector(),
        )

        defaultConnectors.push(new WebWalletConnector())

        return defaultConnectors
    }

    useEffect(() => {
        let cancelled = false;
        resolveConnectors().then((result) => {
            if (!cancelled) setConnectors(result)
        }).catch(() => {
            if (!cancelled) setConnectors([])
        });
        return () => { cancelled = true };
    }, [])

    const chains = [mainnet, sepolia]

    return (
        <StarknetConfig
            chains={chains}
            provider={publicProvider()}
            connectors={connectors}
        >
            <StarknetSync />
            <StarknetHydrator />
            {children}
        </StarknetConfig>
    )
}

export default StarknetProvider;
