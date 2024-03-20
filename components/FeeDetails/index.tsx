
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
import DepositMethod from '../DepositMethod';

const RefuelModal = dynamic(() => import("./RefuelModal"), {
    loading: () => <></>,
});

export default function FeeDetailsComponent({ values }: { values: SwapFormValues }) {
    const { toCurrency, to, refuel, fromExchange, toExchange, from, fromCurrency } = values || {};
    const { fee } = useFee()
    const query = useQueryState();
    const [openModal, setOpenModal] = useState<boolean>(false)
    const nativeAsset = to?.tokens.find(a => a.is_native)

    return (
        <>
            <ResizablePanel>
                <FeeDetails>

                    {
                        from && to && toCurrency && fromCurrency &&
                        <FeeDetails.Item>
                            <DepositMethod />
                        </FeeDetails.Item>
                    }

                    {
                        toCurrency?.refuel_amount_in_usd && !query.hideRefuel && nativeAsset && !toExchange &&
                        <FeeDetails.Item>
                            <RefuelToggle onButtonClick={() => setOpenModal(true)} />
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
                            currency={toCurrency}
                            to={to}
                            refuel={!!refuel}
                            fee={fee}
                            onButtonClick={() => setOpenModal(true)}
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

            <RefuelModal values={values} openModal={openModal} setOpenModal={setOpenModal} fee={fee} />

        </>
    )
}
