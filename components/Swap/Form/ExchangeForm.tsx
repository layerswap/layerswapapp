import { FC, useCallback, useEffect } from "react";
import ValidationError from "@/components/validationError";
import CexPicker from "@/components/Input/CexPicker";
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
import Address from "@/components/Input/Address";
import { ChevronDown } from "lucide-react";
import AddressIcon from "@/components/AddressIcon";
import { ExtendedAddress } from "@/components/Input/Address/AddressPicker/AddressWithIcon";

type Props = {
    setOpenRefuelModal: (open: boolean) => void;
    partner?: Partner;
    isExchange?: boolean;
};

const ExchangeForm: FC<Props> = ({ partner, setOpenRefuelModal, isExchange }) => {
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
                                    <CexPicker />
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
                                    <div className="flex items-center col-span-6">
                                        <Address partner={partner} >{
                                            ({ disabled, addressItem }) => <>
                                                {
                                                    addressItem ? <>
                                                        <AddressButton addressItem={addressItem} network={destination} disabled={disabled} />
                                                    </>
                                                        : <span className="flex items-center pointer-events-none text-shadow-primary-text-muted px-1 py-1">
                                                            <span>Enter Address</span>
                                                            <span className="absolute right-0 pr-2 pointer-events-none text-shadow-primary-text-muted">
                                                                <ChevronDown className="h-3.5 w-3.5 text-secondary-text" aria-hidden="true" />
                                                            </span>
                                                        </span>
                                                }
                                            </>
                                        }</Address>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <label htmlFor="From" className="block font-medium text-secondary-text text-sm">
                                        Enter amount
                                    </label>
                                </div>
                                <div className="relative exchange-amount-field">
                                    <AmountField />
                                </div>
                            </div>
                        </div>
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

const AddressButton = ({ addressItem, network, disabled }) => {

    return <div className="justify-between w-full items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative">
        <div className="flex items-center gap-3">
            <div className='flex text-primary-text items-center justify-center rounded-md h-6 overflow-hidden w-6'>
                <AddressIcon className="scale-150 h-3 w-3" address={addressItem.address} size={36} />
            </div>
            <ExtendedAddress address={addressItem.address} network={network} />
        </div>
        <span className="justify-self-end right-0 flex items-center pointer-events-none  text-primary-text">
            {!disabled && <span className="absolute right-0 pl-1 pointer-events-none text-primary-text">
                <ChevronDown className="h-3.5 w-3.5 text-secondary-text" aria-hidden="true" />
            </span>}
        </span>
    </div>
}