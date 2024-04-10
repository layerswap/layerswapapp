
import { SwapFormValues } from '../DTOs/SwapFormValues';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import { useFee } from '../../context/feeContext';
import RefuelToggle from './Refuel';
import FeeDetails from './FeeDetailsComponent';
import { useQueryState } from '../../context/query';
import ResizablePanel from '../ResizablePanel';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import DepositMethod from './DepositMethod';

const RefuelModal = dynamic(() => import("./RefuelModal"), {
    loading: () => <></>,
});

export default function FeeDetailsComponent({ values }: { values: SwapFormValues }) {
    const { toCurrency, to, refuel, fromExchange, toExchange, from, fromCurrency } = values || {};
    const { fee, isFeeLoading } = useFee()
    const query = useQueryState();
    const [openRefuelModal, setOpenRefuelModal] = useState<boolean>(false)

    return (
        <>
            <ResizablePanel>
                <FeeDetails>

                    {
                        from && to && toCurrency && fromCurrency &&
                        <DepositMethod />
                    }

                    {
                        toCurrency?.refuel && !query.hideRefuel && !toExchange &&
                        <FeeDetails.Item>
                            <RefuelToggle onButtonClick={() => setOpenRefuelModal(true)} />
                        </FeeDetails.Item>
                    }

                    {
                        fee &&
                        <FeeDetails.Item>
                            <DetailedEstimates />
                        </FeeDetails.Item>
                    }

                    <FeeDetails.Item>
                        <ReceiveAmounts
                            destination_token={toCurrency}
                            refuel={!!refuel}
                            fee={fee}
                            onButtonClick={() => setOpenRefuelModal(true)}
                            isFeeLoading={isFeeLoading}
                        />
                    </FeeDetails.Item>

                </FeeDetails>
            </ResizablePanel>

            {/* {
                values.to &&
                values.toCurrency &&
                <Campaign
                    destination={values.to}
                    selected_currency={values.toCurrency}
                    fee={fee.walletFee}
                />
            } */}

            <RefuelModal values={values} openModal={openRefuelModal} setOpenModal={setOpenRefuelModal} fee={fee} />

        </>
    )
}
