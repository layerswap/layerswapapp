import { Form, FormikErrors, useFormikContext } from "formik";
import { FC } from "react";

import Image from 'next/image';
import SwapButton from "../../../buttons/swapButton";
import React from "react";
import AmountAndFeeDetails from "../../../DisclosureComponents/amountAndFeeDetailsComponent";
import AddressInput from "../../../Input/AddressInput";
import { classNames } from "../../../utils/classNames";
import SwapOptionsToggle from "../../../SwapOptionsToggle";
import { ConnectedFocusError } from "../../../../lib/external/ConnectedFocusError";
import ExchangesField from "../../../Select/Exchange";
import NetworkField from "../../../Select/Network";
import { SwapType } from "../../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../../DTOs/SwapFormValues";
import { Partner } from "../../../../Models/Partner";
import Widget from "../../Widget";
import Currencies from "../../../Select/Currencies";

type Props = {
    isPartnerWallet: boolean,
    partner?: Partner,
    lockAddress: boolean,
    resource_storage_url: string
}
const SwapForm: FC<Props> = ({ partner, isPartnerWallet, lockAddress, resource_storage_url }) => {

    const {
        values,
        errors, isValid, isSubmitting
    } = useFormikContext<SwapFormValues>();

    const partnerImage = resource_storage_url + partner?.logo

    return <>
        <Form className="h-full" >
            {values && <ConnectedFocusError />}
            <Widget>
                <Widget.Content>
                    <div className="flex flex-col w-full">
                        <ExchangesField />
                    </div>
                    <div className="flex flex-col w-full">
                        <NetworkField />
                    </div>
                    <div className="flex flex-col w-full">
                        <Currencies />
                    </div>
                    {
                        values.swapType === SwapType.OnRamp &&
                        <div className="w-full mb-3.5 leading-4">
                            <label htmlFor="destination_address" className="block font-normal text-primary-text text-sm">
                                {`To ${values?.network?.name || ''} address`}
                                {isPartnerWallet && <span className='truncate text-sm text-indigo-200'>({partner?.display_name})</span>}
                            </label>
                            <div className="relative rounded-md shadow-sm mt-1.5">
                                {isPartnerWallet &&
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Image alt="Partner logo" className='rounded-md object-contain' src={partnerImage} width="24" height="24"></Image>
                                    </div>
                                }
                                <div>
                                    <AddressInput
                                        disabled={lockAddress || (!values.network || !values.exchange)}
                                        name={"destination_address"}
                                        className={classNames(isPartnerWallet ? 'pl-11' : '', 'disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary block font-semibold w-full bg-darkblue-700 border-darkblue-500 border rounded-lg placeholder-gray-400 truncate')}
                                    />
                                </div>
                            </div>
                        </div>
                    }
                </Widget.Content>
                <Widget.Footer>
                    <SwapButton type='submit' isDisabled={!isValid} isSubmitting={isSubmitting}>
                        {displayErrorsOrSubmit(errors, values.swapType)}
                    </SwapButton>
                </Widget.Footer>
            </Widget>
        </Form >
    </>
}

function displayErrorsOrSubmit(errors: FormikErrors<SwapFormValues>, swapType: SwapType): string {
    if (swapType == SwapType.OnRamp) {
        return errors.exchange?.toString() || errors.network?.toString() || errors.destination_address || "Swap now"
    }
    else {
        return errors.network?.toString() || errors.exchange?.toString() || "Swap now"
    }
}


export default SwapForm
