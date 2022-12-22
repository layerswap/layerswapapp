import { Form, FormikErrors, useFormikContext } from "formik";
import { FC } from "react";

import Image from 'next/image';
import SwapButton from "../../../buttons/swapButton";
import React from "react";
import AddressInput from "../../../Input/AddressInput";
import { classNames } from "../../../utils/classNames";
import SwapOptionsToggle from "../../../SwapOptionsToggle";
import { ConnectedFocusError } from "../../../../lib/external/ConnectedFocusError";
import ExchangesField from "../../../Select/Exchange";
import NetworkField from "../../../Select/Network";
import AmountField from "../../../Input/Amount";
import { SwapType } from "../../../../lib/layerSwapApiClient";
import { SwapFormValues } from "../../../DTOs/SwapFormValues";
import { Partner } from "../../../../Models/Partner";
import Widget from "../../Widget";
import AmountAndFeeDetails from "../../../DisclosureComponents/amountAndFeeDetailsComponent";

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

    const partnerImage = partner?.internal_name ? `${resource_storage_url}/layerswap/partners/${partner?.internal_name?.toLowerCase()}.png` : null

    return <>
        <Form className="h-full" >
            {values && <ConnectedFocusError />}
            <Widget>
                <Widget.Content>
                    <SwapOptionsToggle />
                    <div className={classNames(values.swapType === SwapType.OffRamp ? 'w-full flex-col-reverse md:flex-row-reverse space-y-reverse md:space-x-reverse' : 'md:flex-row flex-col', 'flex justify-between w-full md:space-x-4 space-y-4 md:space-y-0 mb-3.5 leading-4')}>
                        <div className="flex flex-col md:w-80 w-full">
                            <ExchangesField />
                        </div>
                        <div className="flex flex-col md:w-80 w-full">
                            <NetworkField />
                        </div>
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
                                        {
                                            partnerImage &&
                                            <Image alt="Partner logo" className='rounded-md object-contain' src={partnerImage} width="24" height="24"></Image>
                                        }
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
                    {
                        values.swapType === SwapType.OffRamp &&
                        <div className="w-full mb-3.5 leading-4">
                            <label htmlFor="destination_address" className="block font-normal text-primary-text text-sm">
                                {`To ${values?.exchange?.name || ''} address`}
                            </label>
                            <div className="relative rounded-md shadow-sm mt-1.5">
                                <div>
                                    <AddressInput
                                        disabled={(!values.network || !values.exchange)}
                                        name={"destination_address"}
                                        className={classNames('disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary block font-semibold w-full bg-darkblue-700 border-darkblue-500 border rounded-lg placeholder-gray-400 truncate')}
                                    />
                                </div>
                            </div>
                        </div>
                    }
                    <div className="mb-6 leading-4">
                        <AmountField />
                    </div>

                    <div className="w-full">
                        <AmountAndFeeDetails amount={Number(values?.amount)} swapType={values.swapType} currency={values.currency?.baseObject} exchange={values.exchange?.baseObject} network={values.network?.baseObject} />
                    </div>
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
    return errors.exchange?.toString() || errors.network?.toString() || errors.destination_address || errors.amount || "Swap now"
}

export default SwapForm