import { FC, useCallback, useEffect } from "react";
import ResizablePanel from "@/components/ResizablePanel";
import ValidationError from "@/components/validationError";
import CexNetworkPicker from "@/components/Input/CexNetworkPicker";
import QuoteDetails from "@/components/FeeDetails";
import { Widget } from "@/components/Widget/Index";
import FormButton from "../FormButton";
import { TokenBalance } from "@/Models/Balance";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { useFormikContext } from "formik";
import { useSwapDataState } from "@/context/swap";
import useWallet from "@/hooks/useWallet";
import { useQuote } from "@/context/feeContext";
import { useValidationContext } from "@/context/validationErrorContext";
import { useQueryState } from "@/context/query";
import ReserveGasNote from "@/components/ReserveGasNote";
import RefuelToggle from "@/components/FeeDetails/Refuel";
import { Partner } from "@/Models/Partner";
import RoutePicker from "@/components/Input/RoutePicker";
import AmountField from "@/components/Input/Amount";
import SourceWalletPicker from "@/components/Input/SourceWalletPicker";

type Props = {
    setOpenRefuelModal: (open: boolean) => void;
    partner?: Partner;
};

const ExchangeForm: FC<Props> = ({ partner, setOpenRefuelModal }) => {
    const {
        values,
        setValues,
        errors, isValid, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();

    const {
        to: destination,
        from: source,
        fromExchange,
        toExchange,
        currencyGroup,
    } = values;

    const { selectedSourceAccount } = useSwapDataState();
    const { providers, wallets } = useWallet();
    const { minAllowedAmount, valuesChanger, isQuoteLoading, quote } = useQuote();
    const toAsset = values.toAsset;
    const fromAsset = values.fromAsset;
    const { validationMessage } = useValidationContext();
    const query = useQueryState();

    const actionDisplayName = query?.actionButtonText || "Swap now";

    useEffect(() => {
        valuesChanger(values);
    }, [values, values.destination_address]);

    useEffect(() => {
        if (!source || !toAsset || !toAsset.refuel) {
            setFieldValue('refuel', false, true);
        }
    }, [toAsset, destination, source, fromAsset, currencyGroup]);

    useEffect(() => {
        if (values.refuel && minAllowedAmount && (Number(values.amount) < minAllowedAmount)) {
            setFieldValue('amount', minAllowedAmount);
        }
    }, [values.refuel, destination, minAllowedAmount]);

    const handleReserveGas = useCallback((walletBalance: TokenBalance, networkGas: number) => {
        if (walletBalance && networkGas)
            setFieldValue('amount', walletBalance?.amount - networkGas);
    }, [setFieldValue]);

    const sourceWalletNetwork = values.fromExchange ? undefined : values.from;
    const shouldConnectWallet = (sourceWalletNetwork && values.from?.deposit_methods?.includes('wallet') && values.depositMethod !== 'deposit_address' && !selectedSourceAccount) || (!values.from && !values.fromExchange && !wallets.length && values.depositMethod !== 'deposit_address');

    return (
        <Widget className="sm:min-h-[450px] h-full">
            <Widget.Content>
                <div className="w-full min-h-[79svh] sm:min-h-[480px] flex flex-col justify-between">
                    <div>
                        <div className='flex-col relative flex justify-between gap-1.5 w-full mb-3.5 leading-4'>
                            <div className="flex flex-col w-full py-4.5 space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="From" className="block font-medium text-secondary-text text-sm">
                                        Send from
                                    </label>
                                </div>
                                <div className="relative">
                                    <RoutePicker direction="from" />
                                </div>

                                <div className="flex justify-between items-center">
                                    <label htmlFor="From" className="block font-medium text-secondary-text text-sm">
                                        Send to
                                    </label>
                                </div>
                                <div className="relative">
                                    <RoutePicker direction="to" />
                                </div>

                                <div className="hover:bg-secondary-400 bg-secondary-300 rounded-xl px-2 py-3 mb-4">
                                    <SourceWalletPicker />
                                </div>

                                <div className="flex justify-between items-center">
                                    <label htmlFor="From" className="block font-medium text-secondary-text text-sm">
                                        Enter amount
                                    </label>
                                </div>
                                <div className="relative exchange-amount-field">
                                    <AmountField exchangeAmount={true}/>
                                </div>
                            </div>
                        </div>
                        {
                            (((fromExchange && destination) || (toExchange && source)) && currencyGroup) &&
                            <div className="mb-6 leading-4">
                                <ResizablePanel>
                                    <CexNetworkPicker direction={fromExchange ? 'from' : 'to'} partner={partner} />
                                </ResizablePanel>
                            </div>
                        }
                        <div className="w-full">
                            {values.amount &&
                                <ReserveGasNote onSubmit={handleReserveGas} />
                            }
                        </div>
                    </div>
                    <div className="space-y-3">
                        {
                            values.toAsset?.refuel && !query.hideRefuel && !toExchange &&
                            <RefuelToggle onButtonClick={() => setOpenRefuelModal(true)} />
                        }
                        {
                            validationMessage
                                ? <ValidationError />
                                : <QuoteDetails swapValues={values} quote={quote} isQuoteLoading={isQuoteLoading} />
                        }
                    </div>
                </div>
            </Widget.Content>
            <Widget.Footer>
                <FormButton
                    shouldConnectWallet={shouldConnectWallet}
                    values={values}
                    isValid={isValid}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    actionDisplayName={actionDisplayName}
                    partner={partner}
                />
            </Widget.Footer>
        </Widget>
    )
}

export default ExchangeForm;