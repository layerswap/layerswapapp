import { SwapDataProvider } from "@/context/swap";
import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./NetworkExchangeTabs";
import NetworkForm from "./NetworkForm";
import ExchangeForm from "./ExchangeForm";
import NetworkTabIcon from "@/components/icons/NetworkTabIcon";
import ExchangeTabIcon from "@/components/icons/ExchangeTabIcon";
import { BalanceAccountsProvider } from "@/context/balanceAccounts";
import FormWrapper from "./FormWrapper";
import { Widget } from "@/components/Widget/Index";
import { ValidationProvider } from "@/context/validationContext";
import { useQueryState } from "@/context/query";
import { useSettingsState } from "@/context/settings";

export default function Form() {
    const { from } = useQueryState()
    const { sourceExchanges } = useSettingsState()
    const defaultTab = useMemo(() => {
        return defaultTabResolver({ from, sourceExchanges })
    }, [from, sourceExchanges])

    return <BalanceAccountsProvider>
        <Tabs defaultValue={defaultTab}>
            <TabsList>
                <TabsTrigger
                    label="Swap"
                    Icon={NetworkTabIcon}
                    value="cross-chain" />
                <TabsTrigger
                    label="Deposit from CEX"
                    Icon={ExchangeTabIcon}
                    value="exchange" />
            </TabsList>

            <TabsContent value="cross-chain">
                <SwapDataProvider>
                    <FormWrapper type="cross-chain">
                        <Widget className="h-full" >
                            <ValidationProvider>
                                <NetworkForm />
                            </ValidationProvider>
                        </Widget>
                    </FormWrapper>
                </SwapDataProvider>
            </TabsContent>

            <TabsContent value="exchange">
                <SwapDataProvider>
                    <FormWrapper type="exchange">
                        <Widget className="h-full" >
                            <ValidationProvider>
                                <ExchangeForm />
                            </ValidationProvider>
                        </Widget>
                    </FormWrapper>
                </SwapDataProvider>
            </TabsContent>

        </Tabs>
    </BalanceAccountsProvider>
}

const defaultTabResolver = ({ from, sourceExchanges }: { from: string | undefined, sourceExchanges: ReturnType<typeof useSettingsState>['sourceExchanges'] }) => {
    if (from) {
        const isCex = sourceExchanges.some(exchange => exchange.name === from);
        if (isCex) {
            return "exchange";
        }
    }
    return "cross-chain";
}