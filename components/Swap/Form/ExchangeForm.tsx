import { FC, useMemo, useState } from "react";
import ValidationError from "@/components/validationError";
import CexPicker, { SelectedEchangePlaceholder } from "@/components/Input/CexPicker";
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
import clsx from "clsx";
import { useSwapDataState } from "@/context/swap";
import { useClickOutside } from "@/hooks/useClickOutside";
import ResizablePanel from "@/components/ResizablePanel";

type Props = {
    partner?: Partner;
};

const ExchangeForm: FC<Props> = ({ partner }) => {
    const {
        values, isSubmitting
    } = useFormikContext<SwapFormValues>();

    const { fromAsset: fromCurrency, from, to: destination, destination_address, amount } = values || {};
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values, true), [values]);
    const [actionTempValue, setActionTempValue] = useState<number | undefined>(0)

    const { wallets } = useWallet();
    const WalletIcon = wallets.find(wallet => wallet.address.toLowerCase() == destination_address?.toLowerCase())?.icon;

    const { swapId } = useSwapDataState()
    const quoteRefreshInterval = !!swapId ? 0 : undefined;
    const { isQuoteLoading, quote, minAllowedAmount, maxAllowedAmount: maxAmountFromApi } = useQuoteData(quoteArgs, quoteRefreshInterval);
    const { routeValidation, formValidation } = useValidationContext();

    const isValid = !formValidation.message;
    const error = formValidation.message;
    const { ref: parentRef, isActive: showQuickActions, activate: setShowQuickActions } = useClickOutside<HTMLDivElement>(false)

    const handleActionHover = (value: number | undefined) => {
        setActionTempValue(value)
    }

    return (
        <>
            <DepositMethodComponent />
            <Form className="h-full grow flex flex-col justify-between">
                <ResizablePanel>
                    <Widget.Content>
                        <div className="w-full max-sm:min-h-[79svh] flex flex-col justify-between mt-2 sm:mt-0">
                            <div className='flex-col relative flex justify-between gap-1.5 w-full mb-3 leading-4'>
                                <div className="flex flex-col w-full space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="From" className="block font-normal text-secondary-text text-base leading-5">
                                            Send from
                                        </label>
                                        <div className="relative">
                                            <CexPicker />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="From" className="block font-normal text-secondary-text text-base leading-5">
                                            Send to
                                        </label>
                                        <div className="relative group exchange-picker">
                                            <RoutePicker direction="to" isExchange={true} />
                                        </div>
                                        <div className="hover:bg-secondary-300 bg-secondary-500 rounded-2xl p-3">
                                            <Address partner={partner} >{
                                                ({ disabled, addressItem }) => <>
                                                    {
                                                        addressItem ? <>
                                                            <AddressButton addressItem={addressItem} network={destination} disabled={disabled} WalletIcon={WalletIcon} />
                                                        </>
                                                            :
                                                            <span className="flex items-center">
                                                                <SelectedEchangePlaceholder placeholder='Enter destination address' />
                                                                <span className="absolute right-0 px-1 pr-5 pointer-events-none text-primary-text">
                                                                    <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
                                                                </span>
                                                            </span>
                                                    }
                                                </>
                                            }</Address>
                                        </div>
                                    </div>

                                    <div className="bg-secondary-500 rounded-2xl p-3 group space-y-2" onClick={setShowQuickActions} ref={parentRef}>
                                        <div className="flex justify-between items-center">
                                            <label htmlFor="From" className="block font-normal text-secondary-text text-base ml-2 leading-5">
                                                Enter amount
                                            </label>
                                            {
                                                from && fromCurrency && minAllowedAmount && maxAmountFromApi &&
                                                <div className={clsx({
                                                    "hidden": !showQuickActions,
                                                    "block": showQuickActions,
                                                },
                                                    "group-hover:block"
                                                )}>
                                                    <MinMax from={from} fromCurrency={fromCurrency} limitsMinAmount={minAllowedAmount} limitsMaxAmount={maxAmountFromApi} onActionHover={handleActionHover} depositMethod="deposit_address" />
                                                </div>
                                            }
                                        </div>
                                        <div className="relative group exchange-amount-field">
                                            <AmountField
                                                className="!pb-0 !rounded-xl"
                                                fee={quote}
                                                usdPosition="right"
                                                actionValue={actionTempValue}
                                            />
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
                </ResizablePanel>
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
            <div className="flex bg-secondary-400 text-primary-text items-center justify-center rounded-md h-7 w-7 overflow-hidden">
                {
                    WalletIcon ? (
                        <WalletIcon className="h-7 w-7 object-contain" />
                    ) : (
                        <AddressIcon className="scale-150 h-9 w-9" address={addressItem.address} size={36} />
                    )
                }
            </div>
            <ExtendedAddress address={addressItem.address} network={network} />
        </div>
        <span className="justify-self-end right-0 flex items-center pointer-events-none  text-primary-text">
            {!disabled && <span className="absolute right-0 pr-2 pointer-events-none text-primary-text">
                <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
            </span>}
        </span>
    </div>
}