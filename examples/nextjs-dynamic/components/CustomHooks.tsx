"use client";
import { WalletHooksProvider } from "@layerswap/widget";
import { ReactNode } from "react";
import useCustomEVM from "../hooks/useCustomEVM";

export default function CustomHooks({ children }: { children: ReactNode }) {
    const customEvm = useCustomEVM();
    return <WalletHooksProvider overides={{ evm: customEvm }}>{children}</WalletHooksProvider>;
}