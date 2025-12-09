'use client'
import { WalletWrapper } from "@layerswap/widget/types";
import { ImtblPassportProviderWrapper } from "./ImtblPassportProvider";
import React from "react";
import { AppSettings } from "@layerswap/widget/internal";

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

/**
 * @deprecated Use createImmutablePassportProvider() instead. This export will be removed in a future version.
 * Note: This uses undefined config which requires configuration to be provided elsewhere.
 */
export const ImtblPassportProvider: WalletWrapper = {
    id: "imtblPassport",
    wrapper: ({ children }: { children: React.ReactNode }) => {
        const imtblPassportConfig = AppSettings.ImtblPassportConfig
        return (
            <ImtblPassportProviderWrapper imtblPassportConfig={imtblPassportConfig}>
                {children}
            </ImtblPassportProviderWrapper>
        );
    }
};