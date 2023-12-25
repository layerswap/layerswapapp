
import { SwapFormValues } from '../../DTOs/SwapFormValues';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../shadcn/accordion';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import Campaign from './Campaign';
import { useFee } from '../../../context/feeContext';
import { useSettingsState } from '../../../context/settings';
import RefuelToggle from './Refuel';
import CEXNetworkFormField from '../../Input/CEXNetworkFormField';
import FeeDetails from './FeeDetailsComponent';

export default function FeeDetailsComponent({ values }: { values: SwapFormValues }) {
    const { toCurrency, from, to, refuel, fromExchange, toExchange } = values || {};
    const { fee } = useFee()
    const currency = toCurrency
    const { layers } = useSettingsState()

    return (
        <>
            <FeeDetails>

                {
                    ((fromExchange || toExchange) && (from || to)) &&
                    <FeeDetails.Item>
                        <CEXNetworkFormField direction={fromExchange ? 'from' : 'to'} />
                    </FeeDetails.Item>
                }

                {refuel &&
                    <FeeDetails.Item>
                        <RefuelToggle />
                    </FeeDetails.Item>
                }

                <FeeDetails.Item>
                    <DetailedEstimates
                        networks={layers}
                        selected_currency={currency}
                        source={from}
                        destination={to}
                    />
                </FeeDetails.Item>

                <FeeDetails.Item>
                    <ReceiveAmounts
                        currency={currency}
                        to={to}
                        receive_amount={fee.walletReceiveAmount}
                        refuel={!!refuel}
                    />
                </FeeDetails.Item>

            </FeeDetails>

            {/* {
                values.to &&
                values.toCurrency &&
                <Campaign
                    destination={values.to}
                    selected_currency={values.toCurrency}
                    fee={fee.walletFee}
                />
            } */}
        </>
    )
}
