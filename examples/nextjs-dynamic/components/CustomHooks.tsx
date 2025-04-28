import { WalletHooksProvider } from "@layerswap/widget";
import useCustomEVM from "../hooks/useCustomEVM";

export default function ({ children }: { children: JSX.Element | JSX.Element[] }) {
    const customEvm = useCustomEVM()
    return <WalletHooksProvider overides={{ evm: customEvm }}>
        {children}
    </WalletHooksProvider>
}