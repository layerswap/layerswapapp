import { removeSwapPath, SwapDataProvider } from "@/context/swap";
import React, { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { NetworkExchangeTabs, Tabs, TabsContent, useTabs } from "./Tabs";
import NetworkForm from "./NetworkForm";
import ExchangeForm from "./ExchangeForm";
import DepositAddressForm from "./DepositAddressForm";
import FormWrapper from "./FormWrapper";
import { Widget } from "@/components/Widget/Index";
import { ValidationProvider } from "@/context/validationContext";
import { useQueryState } from "@/context/query";
import { useSettingsState } from "@/context/settings";
import useSWR from "swr";
import { ApiResponse } from "@/Models/ApiResponse";
import { Partner } from "@/Models/Partner";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import { THEME_COLORS } from "@/Models/Theme";

export default function Form() {
    const { from, appName, defaultTab: defaultTabQueryParam, theme: themeName } = useQueryState()
    const { sourceExchanges } = useSettingsState()
    const defaultTab = useMemo(() => {
        return defaultTabResolver({ from, sourceExchanges, defaultTabQueryParam })
    }, [from, sourceExchanges])

    const theme = THEME_COLORS[themeName || 'default']

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = appName && partnerData?.data?.client_id?.toLowerCase() === (appName as string)?.toLowerCase() ? partnerData?.data : undefined

    return <Tabs defaultValue={defaultTab}>
        <SwapPathTabSync />
        {!theme?.header?.hideTabs ? <div className="hidden sm:block">
            <NetworkExchangeTabs />
        </div> : null}

        <TabsContent value="cross-chain">
            <SwapDataProvider>
                <FormWrapper type="cross-chain" partner={partner}>
                    <Widget contextualMenu={<div className="block sm:hidden">
                        <NetworkExchangeTabs />
                    </div>}>
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
                        <div className="block sm:hidden">
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

        <TabsContent value="deposit-address">
            <SwapDataProvider>
                <FormWrapper type="deposit-address" partner={partner}>
                    <Widget contextualMenu={
                        <div className="block sm:hidden">
                            <NetworkExchangeTabs />
                        </div>
                    }>
                        <ValidationProvider>
                            <DepositAddressForm partner={partner} />
                        </ValidationProvider>
                    </Widget>
                </FormWrapper>
            </SwapDataProvider>
        </TabsContent>

    </Tabs>
}

// The deposit-address flow writes /swap/{id} into the URL (shallow pushState)
// when it auto-creates a swap. Each tab has its own SwapDataProvider, so on tab
// switch that provider's swapId is gone but the URL path lingers. Clear it on
// every tab change. Scoped to tab changes (not unmount) so it never races with
// real page navigation.
const SwapPathTabSync = () => {
    const { activeId } = useTabs()
    const router = useRouter()
    const prevActiveId = useRef(activeId)
    useEffect(() => {
        if (prevActiveId.current === activeId) return
        prevActiveId.current = activeId
        removeSwapPath(router)
    }, [activeId, router])
    return null
}

const defaultTabResolver = ({ from, sourceExchanges, defaultTabQueryParam }: { from: string | undefined, sourceExchanges: ReturnType<typeof useSettingsState>['sourceExchanges'], defaultTabQueryParam: string | undefined }) => {
    if (defaultTabQueryParam) {
        if (defaultTabQueryParam === "swap") {
            return "cross-chain";
        }
        if (defaultTabQueryParam === "cex") {
            return "exchange";
        }
        if (defaultTabQueryParam === "deposit") {
            return "deposit-address";
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