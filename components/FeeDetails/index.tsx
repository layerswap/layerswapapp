
import { SwapFormValues } from '../DTOs/SwapFormValues';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import { useFee } from '../../context/feeContext';
import RefuelToggle from './Refuel';
import FeeDetails from './FeeDetailsComponent';
import { useQueryState } from '../../context/query';
import ResizablePanel from '../ResizablePanel';

export default function FeeDetailsComponent({ values }: { values: SwapFormValues }) {
    const { toCurrency, from, to, refuel, fromExchange, toExchange } = values || {};
    const { fee } = useFee()
    const query = useQueryState();
    const nativeAsset = to?.assets.find(a => a.is_native)

    return (
        <>
            <FeeDetails>

                {
                    toCurrency?.refuel_amount_in_usd && !query.hideRefuel && nativeAsset && !toExchange &&
                    <FeeDetails.Item>
                        <RefuelToggle />
                    </FeeDetails.Item>
                }

                {
                    from && to &&
                    <FeeDetails.Item>
                        <DetailedEstimates />
                    </FeeDetails.Item>
                }

                <ResizablePanel>
                    <FeeDetails.Item>
                        <ReceiveAmounts
                            currency={toCurrency}
                            to={to}
                            receive_amount={fee.walletReceiveAmount}
                            refuel={!!refuel}
                            fee={fee}
                        />
                    </FeeDetails.Item>
                </ResizablePanel>

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
