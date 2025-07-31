import { FC, useMemo, useState } from "react";
import ValidationError from "@/components/validationError";
import CexPicker from "@/components/Input/CexPicker";
import QuoteDetails from "@/components/FeeDetails";
import { Widget } from "@/components/Widget/Index";
import FormButton from "../FormButton";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Form, useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import RoutePicker from "@/components/Input/RoutePicker";
import AmountField from "@/components/Input/Amount";
import Address from "@/components/Input/Address";
import { ChevronDown } from "lucide-react";
import AddressIcon from "@/components/AddressIcon";
import { ExtendedAddress } from "@/components/Input/Address/AddressPicker/AddressWithIcon";
import DepositMethodComponent from "@/components/FeeDetails/DepositMethod";
import MinMax from "@/components/Input/Amount/MinMax";
import { transformFormValuesToQuoteArgs, useQuoteData } from "@/hooks/useFee";
import { useValidationContext } from "@/context/validationContext";
import useWallet from "@/hooks/useWallet";
import sleep from "@/lib/wallets/utils/sleep";
import clsx from "clsx";

type Props = {
    partner?: Partner;
};

const ExchangeForm: FC<Props> = ({ partner }) => {
    const {
        values, isSubmitting
    } = useFormikContext<SwapFormValues>();

    const { fromAsset: fromCurrency, from, to: destination, destination_address, amount } = values || {};
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values), [values]);
    const [isAmountFocused, setIsAmountFocused] = useState(false);

    const { wallets } = useWallet();
    const WalletIcon = wallets.find(wallet => wallet.address.toLowerCase() == destination_address?.toLowerCase())?.icon;

    const { isQuoteLoading, quote, minAllowedAmount, maxAllowedAmount: maxAmountFromApi } = useQuoteData(quoteArgs);
    const { routeValidation, formValidation } = useValidationContext();

    const isValid = !formValidation.message;
    const error = formValidation.message;
    const showMinMax = isAmountFocused || !amount;

    return (
        <>
            <DepositMethodComponent />
            <Form className="h-full grow flex flex-col justify-between">
                <Widget.Content>
                    <div className="w-full min-h-[79svh] sm:min-h-[480px] flex flex-col justify-between mt-2 sm:mt-0">
                        <div className='flex-col relative flex justify-between gap-1.5 w-full mb-3 leading-4'>
                            <div className="flex flex-col w-full space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="From" className="block font-normal text-secondary-text text-base leading-5">
                                        Send from
                                    </label>
                                </div>
                                <div className="relative">
                                    <CexPicker />
                                </div>

                                <div className="flex justify-between items-center">
                                    <label htmlFor="From" className="block font-normal text-secondary-text text-base leading-5">
                                        Send to
                                    </label>
                                </div>
                                <div className="relative group exchange-picker">
                                    <RoutePicker direction="to" />
                                </div>

                                <div className="hover:bg-secondary-300 bg-secondary-500 rounded-xl px-2 py-3 mb-4">
                                    <div className="flex items-center col-span-6">
                                        <Address partner={partner} >{
                                            ({ disabled, addressItem }) => <>
                                                {
                                                    addressItem ? <>
                                                        <AddressButton addressItem={addressItem} network={destination} disabled={disabled} WalletIcon={WalletIcon} />
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
                                <div className="bg-secondary-500 rounded-lg p-1 pt-1.5 group">
                                    <div className="flex justify-between items-center mb-2 px-2">
                                        <label htmlFor="From" className="block font-normal text-secondary-text text-base leading-5">
                                            Enter amount
                                        </label>
                                        {
                                            from && fromCurrency && minAllowedAmount && maxAmountFromApi &&
                                            <div className={clsx({
                                                "hidden": !showMinMax,
                                                "block": showMinMax
                                            }
                                            )}>
                                                <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} />
                                            </div>
                                        }
                                    </div>
                                    <div className="relative group exchange-amount-field px-1">
                                        <AmountField usdPosition="right" onAmountFocus={() => setIsAmountFocused(true)} onAmountBlur={async () => { await sleep(500); setIsAmountFocused(false) }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {
                                routeValidation.message
                                    ? <ValidationError />
                                    : <QuoteDetails swapValues={values} quote={quote} isQuoteLoading={isQuoteLoading} />
                            }
                        </div>
                    </div>
                </Widget.Content>
                <Widget.Footer>
                    <FormButton
                        shouldConnectWallet={false}
                        values={values}
                        isValid={isValid}
                        error={error}
                        isSubmitting={isSubmitting}
                        partner={partner}
                    />
                </Widget.Footer>
            </Form>
        </>
    )
}

export default ExchangeForm;

const AddressButton = ({ addressItem, network, disabled, WalletIcon }) => {
    return <div className="justify-between w-full items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative">
        <div className="flex items-center gap-2">
            <div className='flex text-primary-text items-center justify-center rounded-md h-6 overflow-hidden w-6'>
                {WalletIcon ? (
                    <WalletIcon className="h-4 w-4 object-contain" />
                ) : (
                    <AddressIcon className="scale-150 h-3 w-3" address={addressItem.address} size={36} />
                )}
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