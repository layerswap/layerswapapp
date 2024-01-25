
import { SwapFormValues } from '../DTOs/SwapFormValues';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import { useFee } from '../../context/feeContext';
import { useSettingsState } from '../../context/settings';
import RefuelToggle from './Refuel';
import CEXNetworkFormField from '../Input/CEXNetworkFormField';
import FeeDetails from './FeeDetailsComponent';
import { useQueryState } from '../../context/query';

export default function FeeDetailsComponent({ values }: { values: SwapFormValues }) {
    const { toCurrency, from, to, refuel, fromExchange, toExchange } = values || {};
    const { fee } = useFee()
    const { layers } = useSettingsState()
    const query = useQueryState();
    const nativeAsset = to?.assets.find(a => a.is_native)

    return (
        <>
            <FeeDetails>

                {
                    (fromExchange || toExchange) &&
                    <FeeDetails.Item>
                        <CEXNetworkFormField direction={fromExchange ? 'from' : 'to'} />
                    </FeeDetails.Item>
                }

                {
                    toCurrency?.refuel_amount_in_usd && !query.hideRefuel && nativeAsset &&
                    <FeeDetails.Item>
                        <RefuelToggle />
                    </FeeDetails.Item>
                }

                {from && to &&
                    <FeeDetails.Item>
                        <DetailedEstimates
                            networks={layers}
                            selected_currency={toCurrency}
                            source={from}
                            destination={to}
                        />
                    </FeeDetails.Item>
                }

                <FeeDetails.Item>
                    <ReceiveAmounts
                        currency={toCurrency}
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
