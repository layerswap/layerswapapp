
import { SwapFormValues } from '../DTOs/SwapFormValues';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import { useFee } from '../../context/feeContext';
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
    const { toCurrency, to, refuel, toExchange, from, fromCurrency } = values || {};
    const { fee, isFeeLoading } = useFee()
    const query = useQueryState();
    const [openRefuelModal, setOpenRefuelModal] = useState<boolean>(false)

    return (
        <>
            <ResizablePanel>

                {
                    from && to && toCurrency && fromCurrency &&
                    <DepositMethod />
                }

                <FeeDetails>
                    {
                        toCurrency?.refuel && !query.hideRefuel && !toExchange &&
                        <FeeDetails.Item>
                            <RefuelToggle onButtonClick={() => setOpenRefuelModal(true)} />
                        </FeeDetails.Item>
                    }

                    {
                        fee && fromCurrency && toCurrency &&
                        <FeeDetails.Item>
                            <DetailedEstimates />
                        </FeeDetails.Item>
                    }

                    {
                        values.to &&
                        values.toCurrency &&
                        <Campaign
                            destination={values.to}
                            reward={fee?.reward}
                        />
                    }

                    <FeeDetails.Item>
                        <ReceiveAmounts
                            source_token={fromCurrency}
                            destination_token={toCurrency}
                            refuel={!!refuel}
                            fee={fee}
                            onButtonClick={() => setOpenRefuelModal(true)}
                            isFeeLoading={isFeeLoading}
                        />
                    </FeeDetails.Item>

                </FeeDetails>
            </ResizablePanel>

            <RefuelModal values={values} openModal={openRefuelModal} setOpenModal={setOpenRefuelModal} fee={fee} />

        </>
    )
}
