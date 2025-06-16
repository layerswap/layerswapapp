import { SwapFormValues } from '../DTOs/SwapFormValues';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import { useQuote } from '../../context/feeContext';
import FeeDetails from './FeeDetailsComponent';
import { useQueryState } from '../../context/query';
import ResizablePanel from '../ResizablePanel';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import DepositMethod from './DepositMethod';
import Campaign from './Campaign';

const RefuelModal = dynamic(() => import("./RefuelModal"), {
    loading: () => <></>,
});

const RefuelToggle = dynamic(() => import("./Refuel"), {
    loading: () => <></>,
});

export default function FeeDetailsComponent({ values }: { values: SwapFormValues }) {
    const { toCurrency, to, toExchange, from, fromCurrency, amount, destination_address } = values || {};
    const { quote, isQuoteLoading } = useQuote()
    const query = useQueryState();
    const [openRefuelModal, setOpenRefuelModal] = useState<boolean>(false)

    return (
        <span className={amount ? 'visible' : 'hidden'}>
            <ResizablePanel>
                {
                    from && to && toCurrency && fromCurrency &&
                    <DepositMethod />
                }
                <FeeDetails>
                    {
                        toCurrency?.refuel && !query.hideRefuel && !toExchange &&
                        <RefuelToggle onButtonClick={() => setOpenRefuelModal(true)} />
                    }
                    {
                        (quote || isQuoteLoading) && fromCurrency && toCurrency &&
                        <FeeDetails.Item>
                            <DetailedEstimates />
                        </FeeDetails.Item>
                    }
                    {
                        values.to &&
                        values.toCurrency &&
                        destination_address &&
                        <Campaign
                            destination={values.to}
                            reward={quote?.reward}
                            destinationAddress={destination_address}
                        />
                    }

                </FeeDetails>
            </ResizablePanel>

            <RefuelModal openModal={openRefuelModal} setOpenModal={setOpenRefuelModal} />

        </span>
    )
}
