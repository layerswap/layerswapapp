import { TransferProps } from "@/types"
import { Account, coinQuantityfy, CoinQuantityLike, ScriptTransactionRequest } from 'fuels';

export const transactionBuilder = async (params: { fuelWallet: Account, callData: TransferProps['callData'] }) => {
    const { fuelWallet, callData } = params

    type FuelPrepareData = {
        script: ScriptTransactionRequest,
        quantities: CoinQuantityLike[]
    }
    var parsedCallData: FuelPrepareData = JSON.parse(callData);
    var scriptTransaction = ScriptTransactionRequest.from(parsedCallData.script);
    var quantitiesParsed = parsedCallData.quantities.map(q => coinQuantityfy(q));

    await scriptTransaction.estimateAndFund(fuelWallet, {
        quantities: quantitiesParsed
    });

    return scriptTransaction

}
