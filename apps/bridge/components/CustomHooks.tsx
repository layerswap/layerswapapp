import { WalletHooksProvider, useWallet } from "@layerswap/widget";
import useCustomEVM from "../hooks/useCustomeEvm";


export default function ({ children }: { children: JSX.Element | JSX.Element[] }) {
    const customEvm = useCustomEVM()
    return <WalletHooksProvider overides={{ evm: customEvm }}>
        {children}
    </WalletHooksProvider>
}