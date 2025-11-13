'use client'
import { WalletWrapper } from "@layerswap/widget/types";
import { ImtblPassportProviderWrapper } from "./ImtblPassportProvider";
import React from "react";

export type ImtblPassportConfig = {
    publishableKey: string
    clientId: string
    redirectUri: string
    logoutRedirectUri: string
}

export type ImmutablePassportProviderConfig = {
    imtblPassportConfig?: ImtblPassportConfig
}

export function createImmutablePassportProvider(config: ImmutablePassportProviderConfig = {}): WalletWrapper {
    const { imtblPassportConfig } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <ImtblPassportProviderWrapper imtblPassportConfig={imtblPassportConfig}>
                {children}
            </ImtblPassportProviderWrapper>
        );
    };

    return {
        id: "imtblPassport",
        wrapper: WrapperComponent,
    };
}

export { ImtblRedirect } from "./ImtblPassportProvider";