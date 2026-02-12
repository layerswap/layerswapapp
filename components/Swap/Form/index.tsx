import { SwapDataProvider } from "@/context/swap";
import React, { useMemo, useState } from "react";
import { NetworkExchangeTabs, Tabs, TabsContent } from "./NetworkExchangeTabs";
import NetworkForm from "./NetworkForm";
import ExchangeForm from "./ExchangeForm";
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
import { SwitchUsdTokenProvider } from "@/context/switchUsdToken";

export default function Form() {
    const { from, appName, defaultTab: defaultTabQueryParam, theme: themeName } = useQueryState()
    const { sourceExchanges } = useSettingsState()
    const defaultTab = useMemo(() => {
        return defaultTabResolver({ from, sourceExchanges, defaultTabQueryParam })
    }, [from, sourceExchanges])
    const [showBanner, setShowBanner] = useState(false);

    // useEffect(() => {
    //     if (typeof window === "undefined") return;

    //     const sessionCountKey = "exchange_banner_session_count";
    //     const closedKey = "exchange_banner_closed";
    //     const seenKey = "exchange_banner_seen";

    //     if (sessionStorage.getItem(closedKey) === "1") return;

    //     if (!sessionStorage.getItem(seenKey)) {
    //         sessionStorage.setItem(seenKey, "1");
    //         const next =
    //             (parseInt(localStorage.getItem(sessionCountKey) || "0") || 0) + 1;
    //         localStorage.setItem(sessionCountKey, String(next));
    //         if (next <= 3) setShowBanner(true);
    //     } else {
    //         const count = parseInt(localStorage.getItem(sessionCountKey) || "0") || 0;
    //         if (count <= 3) setShowBanner(true);
    //     }
    // }, []);

    const dismissBanner = () => {
        setShowBanner(false);
        if (typeof window !== "undefined") {
            sessionStorage.setItem("exchange_banner_closed", "1");
        }
    };

    const theme = THEME_COLORS[themeName || 'default']

    const layerswapApiClient = new LayerSwapApiClient()
    const { data: partnerData } = useSWR<ApiResponse<Partner>>(appName && `/internal/apps?name=${appName}`, layerswapApiClient.fetcher)
    const partner = appName && partnerData?.data?.client_id?.toLowerCase() === (appName as string)?.toLowerCase() ? partnerData?.data : undefined

    return <Tabs defaultValue={defaultTab}>
        {!theme?.header?.hideTabs ? <div className="hidden sm:block">
            <NetworkExchangeTabs />
        </div> : null}

        <TabsContent value="cross-chain">
            <SwapDataProvider>
                <SwitchUsdTokenProvider>
                    <FormWrapper type="cross-chain" partner={partner}>
                        <Widget contextualMenu={<div className="block sm:hidden">
                            <NetworkExchangeTabs />
                        </div>}>
                            <ValidationProvider>
                                <NetworkForm partner={partner} />
                            </ValidationProvider>
                        </Widget>
                    </FormWrapper>
                </SwitchUsdTokenProvider>
            </SwapDataProvider>
        </TabsContent>

        <TabsContent value="exchange">
            <SwapDataProvider>
                <SwitchUsdTokenProvider>
                    <FormWrapper type="exchange" partner={partner}>
                        <Widget contextualMenu={
                            <div className="block sm:hidden">
                                <NetworkExchangeTabs />
                            </div>
                        }>
                            <ValidationProvider>
                                <ExchangeForm partner={partner} showBanner={showBanner} dismissBanner={dismissBanner} />
                            </ValidationProvider>
                        </Widget>
                    </FormWrapper>
                </SwitchUsdTokenProvider>
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