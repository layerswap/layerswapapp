import { FC, ReactNode, useEffect, useState } from "react";
import { mainnet, sepolia } from "@starknet-react/chains"
import { StarknetConfig, publicProvider } from "@starknet-react/core";

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const StarknetProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [connectors, setConnectors] = useState<any[]>([])

    const resolveConnectors = async () => {
        const InjectedConnector = (await import('../../node_modules/starknetkit/dist/injectedConnector')).InjectedConnector
        const ArgentMobileConnector = (await import('../../node_modules/starknetkit/dist/argentMobile')).ArgentMobileConnector
        const WebWalletConnector = (await import('../../node_modules/starknetkit/dist/webwalletConnector')).WebWalletConnector

        const isSafari =
            typeof window !== "undefined"
                ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
                : false

        const defaultConnectors: any[] = []

        if (!isSafari) {
            defaultConnectors.push(
                new InjectedConnector({ options: { id: "argentX" } }),
            )
            defaultConnectors.push(
                new InjectedConnector({ options: { id: "braavos" } }),
            )
            defaultConnectors.push(
                new InjectedConnector({ options: { id: "keplr" } }),
            )
        }

        defaultConnectors.push(ArgentMobileConnector.init({
            options: {
                dappName: 'Layerswap',
                projectId: WALLETCONNECT_PROJECT_ID,
                url: 'https://www.layerswap.io/app/',
                description: 'Move crypto across exchanges, blockchains, and wallets.',
            }
        }))
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
            {children}
        </StarknetConfig>
    )
}

export default StarknetProvider;