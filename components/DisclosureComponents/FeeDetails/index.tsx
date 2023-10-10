
import { useSettingsState } from '../../../context/settings';
import { CalculateFee, CalculateReceiveAmount } from '../../../lib/fees';
import { SwapFormValues } from '../../DTOs/SwapFormValues';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shadcn/accordion';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import Campaign from './Campaign';

export default function FeeDetails({ values }: { values: SwapFormValues }) {
    const { networks, currencies } = useSettingsState()
    const { currency, from, to } = values || {}

    let fee = CalculateFee(values, networks);
    let receive_amount = CalculateReceiveAmount(values, networks, currencies);

    return (
        <>
            <div className="mx-auto relative w-full rounded-lg border border-secondary-500 hover:border-secondary-300 bg-secondary-700 px-3.5 py-3 z-[1] transition-all duration-200">
                <Accordion type="single" collapsible>
                    <AccordionItem value='item-1'>
                        <AccordionTrigger className="items-center flex w-full relative gap-2 rounded-lg text-left text-base font-medium">
                            <ReceiveAmounts
                                currencies={currencies}
                                currency={currency}
                                receive_amount={receive_amount} />
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-secondary-text font-normal">
                            <DetailedEstimates
                                currencies={currencies}
                                networks={networks}
                                fee={fee}
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
                values.currency &&
                <Campaign
                    destination={values.to}
                    selected_currency={values.currency}
                    fee={fee}
                />
            }
        </>
    )
}
