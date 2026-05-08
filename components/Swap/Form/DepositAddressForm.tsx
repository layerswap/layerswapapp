import { FC, useEffect } from "react";
import ValidationError from "@/components/validationError";
import { Widget } from "@/components/Widget/Index";
import FormButton from "../FormButton";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Form, useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import RoutePicker from "@/components/Input/RoutePicker";
import Address from "@/components/Input/Address";
import { ChevronRight } from "lucide-react";
import AddressIcon from "@/components/AddressIcon";
import { Address as AddressClass } from "@/lib/address";
import { ExtendedAddress } from "@/components/Input/Address/AddressPicker/AddressWithIcon";
import { SelectedEchangePlaceholder } from "@/components/Input/CexPicker";
import { useValidationContext } from "@/context/validationContext";
import useWallet from "@/hooks/useWallet";
import { Network } from "@/Models/Network";
import { Wallet } from "@/Models/WalletProvider";
import { AddressGroup } from "@/components/Input/Address/AddressPicker";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import shortenString from "@/components/utils/ShortenString";
import useAutoSourceRoute from "@/hooks/useAutoSourceRoute";

type Props = {
    partner?: Partner;
};

const DepositAddressForm: FC<Props> = ({ partner }) => {
    const {
        values, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();

    const { to: destination, destination_address, toAsset: toCurrency, from, fromAsset } = values || {};

    useAutoSourceRoute();

    useEffect(() => {
        setFieldValue('depositMethod', 'deposit_address', true)
    }, [])

    const { wallets } = useWallet();
    const wallet = wallets.find(wallet => wallet.address.toLowerCase() == destination_address?.toLowerCase());

    const { routeValidation, formValidation } = useValidationContext();

    const isValid = !formValidation.message;
    const error = formValidation.message;

    const hasRoute = !!(from && fromAsset && destination && toCurrency && destination_address);

    return (
        <>
            <Form className="h-full grow flex flex-col flex-1 justify-between w-full gap-2">
                <Widget.Content>
                    <div className="w-full flex flex-col justify-between flex-1 relative min-h-[240px]">
                        <div className="flex flex-col w-full gap-3">

                            {/* Token & Network picker */}
                            <div className="space-y-1.5">
                                <span className="text-xs text-secondary-text uppercase tracking-wide px-1">Receive</span>
                                <div className="relative group exchange-picker">
                                    <RoutePicker direction="to" isExchange={true} className="w-full!" />
                                </div>
                            </div>

                            {/* Destination address */}
                            <div className="space-y-1.5">
                                <span className="text-xs text-secondary-text uppercase tracking-wide px-1">To address</span>
                                <Address partner={partner}>{
                                    ({ addressItem }) => {
                                        const addressProviderIcon = (partner?.is_wallet && addressItem?.group === AddressGroup.FromQuery && partner?.logo) ? partner.logo : undefined
                                        return <div className="bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-3.5 py-3 transition-colors cursor-pointer">
                                            {
                                                addressItem ? (
                                                    <AddressButton address={addressItem.address} network={destination} wallet={wallet} addressProviderIcon={addressProviderIcon} />
                                                ) : destination_address ? (
                                                    <AddressButton address={destination_address} />
                                                ) : (
                                                    <div className="flex items-center">
                                                        <SelectedEchangePlaceholder placeholder='Enter destination address' />
                                                        <ChevronRight className="ml-auto h-4 w-4 text-secondary-text shrink-0" aria-hidden="true" />
                                                    </div>
                                                )
                                            }
                                        </div>
                                    }
                                }</Address>
                            </div>
                        </div>
                        <div>
                            {routeValidation.message ? <ValidationError /> : null}
                        </div>
                    </div>
                </Widget.Content>
                <Widget.Footer showPoweredBy>
                    <FormButton
                        shouldConnectWallet={false}
                        values={values}
                        disabled={!isValid || isSubmitting || !hasRoute}
                        error={error}
                        isSubmitting={isSubmitting}
                        partner={partner}
                    />
                </Widget.Footer>
            </Form>
        </>
    )
}

export default DepositAddressForm;

const AddressButton = ({ address, network, wallet, addressProviderIcon }: { address: string, network?: Network, wallet?: Wallet, addressProviderIcon?: string | undefined }) => {
    return <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex bg-secondary-400 text-primary-text items-center justify-center rounded-lg h-8 w-8 overflow-hidden shrink-0">
                {
                    wallet?.icon ? (
                        <wallet.icon className="h-8 w-8 object-contain" />
                    ) : addressProviderIcon ? (<ImageWithFallback
                        alt="Partner logo"
                        className="rounded-lg object-contain h-8 w-8"
                        src={addressProviderIcon}
                        width="36"
                        height="36"
                    />) : (
                        <AddressIcon className="scale-150 h-8 w-8" address={network ? new AddressClass(address, network).full : address} size={36} />
                    )
                }
            </div>
            {
                network ? (
                    <ExtendedAddress address={address} network={network} providerName={wallet?.providerName} showDetails={wallet ? true : false} title={wallet?.displayName?.split("-")[0]} description={wallet?.providerName} logo={wallet?.icon} />
                ) : (
                    <p className="text-sm font-medium text-primary-text truncate">
                        {shortenString(address)}
                    </p>
                )
            }
        </div>
        <ChevronRight className="h-4 w-4 text-secondary-text shrink-0" aria-hidden="true" />
    </div>
}
