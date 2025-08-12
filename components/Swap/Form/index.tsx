import { SwapDataProvider } from "@/context/swap";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./NetworkExchangeTabs";
import NetworkForm from "./NetworkForm";
import ExchangeForm from "./ExchangeForm";
import NetworkTabIcon from "@/components/icons/NetworkTabIcon";
import ExchangeTabIcon from "@/components/icons/ExchangeTabIcon";
import { BalanceAccountsProvider } from "@/context/balanceAccounts";
import FormWrapper from "./FormWrapper";
import { Widget } from "@/components/Widget/Index";
import { ValidationProvider } from "@/context/validationContext";

export default function Form() {
    return <SwapDataProvider>
        <BalanceAccountsProvider>
            <Tabs defaultValue="cross-chain">
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
                <FormWrapper type="cross-chain">
                    <TabsContent value="cross-chain">
                        <Widget className="sm:min-h-[450px] h-full" >
                            <ValidationProvider>
                                <NetworkForm />
                            </ValidationProvider>
                        </Widget>
                    </TabsContent>
                </FormWrapper>
                <FormWrapper type="exchange">
                    <TabsContent value="exchange">
                        <Widget className="sm:min-h-[450px] h-full" >
                            <ValidationProvider>
                                <ExchangeForm />
                            </ValidationProvider>
                        </Widget>
                    </TabsContent>
                </FormWrapper>
            </Tabs>
        </BalanceAccountsProvider>
    </SwapDataProvider>
}
