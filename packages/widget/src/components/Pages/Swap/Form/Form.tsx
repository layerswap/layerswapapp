'use client'
import { SwapDataProvider } from "@/context/swap";
import { useMemo } from "react";
import { NetworkExchangeTabs, Tabs, TabsContent } from "./NetworkExchangeTabs";
import NetworkForm from "./NetworkForm";
import ExchangeForm from "./ExchangeForm";
import FormWrapper from "./FormWrapper";
import { Widget } from "@/components/Widget/Index";
import { ValidationProvider } from "@/context/validationContext";
import { useInitialSettings } from "@/context/settings";
import { useSettingsState } from "@/context/settings";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import useSWR from "swr";
import { ApiResponse } from "@/Models/ApiResponse";
import { Partner } from "@/Models/Partner";
import AppSettings from "@/lib/AppSettings";
import clsx from "clsx";

export default function Form() {
    const { from, appName, defaultTab: defaultTabQueryParam } = useInitialSettings()
    const { sourceExchanges } = useSettingsState()
    const defaultTab = useMemo(() => {
        return defaultTabResolver({ from, sourceExchanges, defaultTabQueryParam })
    }, [from, sourceExchanges])

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = appName && partnerData?.data?.client_id?.toLowerCase() === (appName as string)?.toLowerCase() ? partnerData?.data : undefined

    return <Tabs defaultValue={defaultTab}>
        <div className={clsx("hidden sm:block", { 'sm:hidden': AppSettings.ThemeData?.enableWideVersion !== true })}>
            <NetworkExchangeTabs />
        </div>

        <TabsContent value="cross-chain">
            <SwapDataProvider>
                <FormWrapper type="cross-chain" partner={partner}>
                    <Widget contextualMenu={
                        <div className={clsx("block w-full", { 'sm:hidden': AppSettings.ThemeData?.enableWideVersion == true })}>
                            <NetworkExchangeTabs />
                        </div>
                    }>
                        <ValidationProvider>
                            <NetworkForm partner={partner} />
                        </ValidationProvider>
                    </Widget>
                </FormWrapper>
            </SwapDataProvider>
        </TabsContent>

        <TabsContent value="exchange">
            <SwapDataProvider>
                <FormWrapper type="exchange" partner={partner}>
                    <Widget contextualMenu={
                        <div className={clsx("block w-full", { 'sm:hidden': AppSettings.ThemeData?.enableWideVersion == true })}>
                            <NetworkExchangeTabs />
                        </div>
                    }>
                        <ValidationProvider>
                            <ExchangeForm partner={partner} />
                        </ValidationProvider>
                    </Widget>
                </FormWrapper>
            </SwapDataProvider>
        </TabsContent>

    </Tabs>
}

const defaultTabResolver = ({ from, sourceExchanges, defaultTabQueryParam }: { from: string | undefined, sourceExchanges: ReturnType<typeof useSettingsState>['sourceExchanges'], defaultTabQueryParam: string | undefined }) => {
    if (defaultTabQueryParam) {
        if (defaultTabQueryParam === "swap") {
            return "cross-chain";
        }
        if (defaultTabQueryParam === "cex") {
            return "exchange";
        }
    }
    if (from) {
        const isCex = sourceExchanges.some(exchange => exchange.name === from);
        if (isCex) {
            return "exchange";
        }
    }
    return "cross-chain";
}