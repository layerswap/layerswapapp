
import { SwapFormValues } from '../../DTOs/SwapFormValues';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shadcn/accordion';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import Campaign from './Campaign';
import { useFee } from '../../../context/feeContext';
import { useSettingsState } from '../../../context/settings';

export default function FeeDetails({ values }: { values: SwapFormValues }) {
    const { toCurrency, from, to, refuel } = values || {};
    const { fee } = useFee()
    const currency = toCurrency
    const { layers } = useSettingsState()

    return (
        <>
            <div className="mx-auto relative w-full rounded-lg border border-secondary-500 hover:border-secondary-300 bg-secondary-700 px-3.5 py-3 z-[1] transition-all duration-200">
                <Accordion type="single" collapsible>
                    <AccordionItem value='item-1'>
                        <AccordionTrigger className="items-center flex w-full relative gap-2 rounded-lg text-left text-base font-medium">
                            <ReceiveAmounts
                                currency={currency}
                                to={to}
                                receive_amount={fee.walletReceiveAmount}
                                refuel={!!refuel}
                            />
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-secondary-text font-normal">
                            <DetailedEstimates
                                networks={layers}
                                selected_currency={currency}
                                source={from}
                                destination={to}
                            />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
            {
                values.to &&
                values.toCurrency &&
                <Campaign
                    destination={values.to}
                    selected_currency={values.toCurrency}
                    fee={fee.walletFee}
                />
            }
        </>
    )
}
