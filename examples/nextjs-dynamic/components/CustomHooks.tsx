import { WalletHooksProvider } from "@layerswap/widget";
import useCustomEVM from "../hooks/useCustomEVM";

export default function CustomHooks({ children }: { children: JSX.Element | JSX.Element[] }) {
    const customEvm = useCustomEVM()
    return <WalletHooksProvider overides={{ evm: customEvm }}>
        {children}
    </WalletHooksProvider>
}