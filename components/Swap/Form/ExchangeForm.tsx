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
import Address from "@/components/Input/Address";
import { ChevronDown } from "lucide-react";
import AddressIcon from "@/components/AddressIcon";
import { Address as AddressClass } from "@/lib/address";
import { ExtendedAddress } from "@/components/Input/Address/AddressPicker/AddressWithIcon";
import DepositMethodComponent from "@/components/FeeDetails/DepositMethod";
import MinMax from "@/components/Input/Amount/MinMax";
import { transformFormValuesToQuoteArgs, useQuoteData } from "@/hooks/useFee";
import { useValidationContext } from "@/context/validationContext";
import useWallet from "@/hooks/useWallet";
import clsx from "clsx";
import { useSwapDataState } from "@/context/swap";
import { useClickOutside } from "@/hooks/useClickOutside";
import { Network } from "@/Models/Network";
import { Wallet } from "@/Models/WalletProvider";
import { AddressGroup } from "@/components/Input/Address/AddressPicker";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { ExchangeReceiveAmount } from "@/components/Input/Amount/ExchangeReceiveAmount";
import ExchangeAmountField from "@/components/Input/Amount/ExchangeAmount";
import shortenString from "@/components/utils/ShortenString";

type Props = {
    partner?: Partner;
    showBanner: boolean;
    dismissBanner: () => void;
};

const ExchangeForm: FC<Props> = ({ partner, showBanner, dismissBanner }) => {
    const {
        values, isSubmitting
    } = useFormikContext<SwapFormValues>();

    const { fromAsset: fromCurrency, from, to: destination, destination_address, amount, toAsset: toCurrency } = values || {};
    const quoteArgs = useMemo(() => transformFormValuesToQuoteArgs(values, true), [values]);
    const [actionTempValue, setActionTempValue] = useState<number | undefined>(undefined)

    const { wallets } = useWallet();
    const wallet = wallets.find(wallet => wallet.address.toLowerCase() == destination_address?.toLowerCase());

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
            {/* {showBanner && (
                <div className="mb-3 rounded-2xl border border-secondary-400 bg-secondary-500 p-2.5 text-sm flex items-start justify-between">
                    <div>
                        <p className="text-sm text-primary-text mb-0.5">Deposit from CEX</p>
                        <p className="text-secondary-text text-xs">
                            Easily move crypto from your exchange account to the network of your choice.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={dismissBanner}
                        className="p-1 hover:bg-secondary-400 rounded-md text-secondary-text"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )} */}

            <DepositMethodComponent />
            <Form className="h-full grow flex flex-col flex-1 justify-between w-full gap-2">
                <Widget.Content>
                    <div className="w-full flex flex-col justify-between flex-1 relative">
                        <div className="flex flex-col w-full gap-2">
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
                                <Address partner={partner} >{
                                    ({ addressItem }) => {
                                        const addressProviderIcon = (partner?.is_wallet && addressItem?.group === AddressGroup.FromQuery && partner?.logo) ? partner.logo : undefined
                                        return <div className="hover:bg-secondary-300 bg-secondary-500 rounded-2xl p-3 h-13">
                                            {
                                                addressItem ? <>
                                                    <AddressButton address={addressItem.address} network={destination} wallet={wallet} addressProviderIcon={addressProviderIcon} />
                                                </>
                                                    : destination_address ? <>
                                                        <AddressButton address={destination_address} />
                                                    </>
                                                        :
                                                        <span className="flex items-center">
                                                            <SelectedEchangePlaceholder placeholder='Enter destination address' />
                                                            <span className="absolute right-0 px-1 pr-5 pointer-events-none text-primary-text">
                                                                <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
                                                            </span>
                                                        </span>
                                            }
                                        </div>
                                    }
                                }</Address>
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
                                    <ExchangeAmountField
                                        className="pb-0! rounded-xl!"
                                        fee={quote}
                                        actionValue={actionTempValue}
                                    />
                                    {quote &&
                                        <div className="mt-3 ml-2">
                                            <span className="text-base leading-5 text-secondary-text">You will receive</span>
                                            <ExchangeReceiveAmount
                                                destination_token={toCurrency}
                                                fee={quote}
                                                isFeeLoading={isQuoteLoading}
                                            />
                                        </div>
                                    }
                                </div>
                            </div>
                        </div>
                        <div>
                            {
                                routeValidation.message
                                    ? <ValidationError />
                                    : null
                            }
                            <QuoteDetails swapValues={values} quote={quote?.quote} isQuoteLoading={isQuoteLoading} reward={quote?.reward} variant="base" />
                        </div>
                    </div>
                </Widget.Content>
                <Widget.Footer showPoweredBy>
                    <FormButton
                        shouldConnectWallet={false}
                        values={values}
                        disabled={!isValid || isSubmitting || !quote || isQuoteLoading}
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

const AddressButton = ({ address, network, wallet, addressProviderIcon }: { address: string, network?: Network, wallet?: Wallet, addressProviderIcon?: string | undefined }) => {
    return <div className="justify-between w-full items-center flex font-light space-x-2 mx-auto rounded-lg focus-peer:ring-primary focus-peer:border-secondary-400 focus-peer:border focus-peer:ring-1 focus:outline-none disabled:cursor-not-allowed relative">
        <div className="flex items-center gap-2">
            <div className="flex bg-secondary-400 text-primary-text items-center justify-center rounded-md h-7 w-7 overflow-hidden">
                {
                    wallet?.icon ? (
                        <wallet.icon className="h-7 w-7 object-contain" />
                    ) : addressProviderIcon ? (<ImageWithFallback
                        alt="Partner logo"
                        className="rounded-md object-contain h-7 w-7"
                        src={addressProviderIcon}
                        width="36"
                        height="36"
                    />) : (
                        <AddressIcon className="scale-150 h-9 w-9" address={network ? new AddressClass(address, network).full : address} size={36} />
                    )
                }
            </div>
            {
                network ? (
                    <ExtendedAddress address={address} network={network} providerName={wallet?.providerName} showDetails={wallet ? true : false} title={wallet?.displayName?.split("-")[0]} description={wallet?.providerName} logo={wallet?.icon} />
                ) : (
                    <p className="text-sm block font-medium">
                        {shortenString(address)}
                    </p>
                )
            }
        </div>
        <span className="justify-self-end right-0 flex items-center pointer-events-none  text-primary-text">
            <span className="absolute right-0 pr-2 pointer-events-none text-primary-text">
                <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
            </span>
        </span>
    </div>
}