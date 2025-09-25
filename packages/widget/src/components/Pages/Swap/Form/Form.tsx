import { SwapDataProvider } from "@/context/swap";
import { useMemo } from "react";
import { NetworkExchangeTabs, Tabs, TabsContent } from "./NetworkExchangeTabs";
import NetworkForm from "./NetworkForm";
import ExchangeForm from "./ExchangeForm";
import { BalanceAccountsProvider } from "@/context/balanceAccounts";
import FormWrapper from "./FormWrapper";
import { Widget } from "@/components/Widget/Index";
import { ValidationProvider } from "@/context/validationContext";
import { useInitialSettings } from "@/context/settings";
import { useSettingsState } from "@/context/settings";
import { SwapFormValues } from "./SwapFormValues";

export default function Form({ formValues }: { formValues?: SwapFormValues }) {
    const { from } = useInitialSettings()
    const { sourceExchanges } = useSettingsState()
    const defaultTab = useMemo(() => {
        return defaultTabResolver({ from, sourceExchanges })
    }, [from, sourceExchanges])

    return <BalanceAccountsProvider>
        <Tabs defaultValue={defaultTab}>
            <div className="hidden sm:block">
                <NetworkExchangeTabs />
            </div>

            <TabsContent value="cross-chain">
                <SwapDataProvider>
                    <FormWrapper type="cross-chain">
                        <Widget>
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
                        <Widget>
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