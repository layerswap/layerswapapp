import { Field, useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef, useState } from "react";
import { useSettingsState } from "../../context/settings";
import KnownInternalNames from "../../lib/knownIds";
import { SwapType } from "../../lib/layerSwapApiClient";
import NetworkSettings from "../../lib/NetworkSettings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'
import Image from 'next/image'
import { toast } from "react-hot-toast";
import SpinIcon from "../icons/spinIcon";

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
    label?: string
    disabled: boolean;
    name: string;
    className?: string;
    children?: JSX.Element | JSX.Element[];
    ref?: any;
    loading: boolean;
    onSetCoinbaseDepoisteAddress?: () => Promise<void>
}

const AddressInput: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ label, disabled, name, className, onSetCoinbaseDepoisteAddress, loading }, ref) => {

        const {
            values
        } = useFormikContext<SwapFormValues>();


        const placeholder = NetworkSettings.KnownSettings[values?.network?.baseObject?.internal_name]?.AddressPlaceholder ?? "0x123...ab56c"
        const { discovery: { resource_storage_url }, exchanges, networks } = useSettingsState();

        const isCoinbaseOfframp = values?.swapType === SwapType.OffRamp && values?.exchange?.baseObject?.internal_name === KnownInternalNames.Exchanges.Coinbase

        const coinbaseLogoURL = `${resource_storage_url}/layerswap/networks/${KnownInternalNames.Exchanges.Coinbase.toLowerCase()}.png`

        const handleUseCoinbase = async () => {
            try {
                await onSetCoinbaseDepoisteAddress()
            }
            catch (e) {
                toast(e.message)
            }
        }

        return (<>
            {label &&
                <label htmlFor={name} className="block font-normal text-primary-text text-sm">
                    {label}
                </label>
            }
            <Field name={name}>
                {({ field }) => (
                    <div className="flex rounded-lg shadow-sm mt-1.5 bg-darkblue-700 border-darkblue-500 border ">
                        <input
                            {...field}
                            value={field.value || ""}
                            ref={ref}
                            placeholder={placeholder}
                            autoCorrect="off"
                            type={"text"}
                            name={name}
                            id={name}
                            disabled={disabled}
                            className={classNames('disabled:cursor-not-allowed h-12 border-none leading-4 focus:ring-primary focus:border-primary block font-semibold w-full bg-darkblue-700 rounded-lg placeholder-gray-400 truncate focus-peer:ring-primary focus-peer:border-darkblue-500 focus-peer:border focus-peer:ring-1 focus:outline-none',
                                className
                            )}
                        />
                        {
                            isCoinbaseOfframp &&
                            <span className="inline-flex items-center mr-2">
                                <div className="text-xs flex items-center space-x-2 ml-3 md:ml-5">
                                    <button
                                        type="button"
                                        className="p-1.5 duration-200 transition bg-darkblue-400 hover:bg-darkblue-300 rounded-md border border-darkblue-400 hover:border-darkblue-100"
                                        onClick={handleUseCoinbase}

                                    >
                                        <div className="flex items-center" >
                                            <div className="flex-shrink-0 h-6 w-6 relative">
                                                {
                                                    loading ? <SpinIcon className="animate-spin h-6 w-6" />
                                                        : <Image
                                                            src={coinbaseLogoURL}
                                                            alt="Coinbase Logo"
                                                            height="40"
                                                            width="40"
                                                            loading="eager"
                                                            priority
                                                            layout="responsive"
                                                            className="rounded-md object-contain"
                                                        />
                                                }

                                            </div>
                                            <span className="ml-3 block truncate">Set from coinbase</span>
                                        </div>
                                    </button>
                                </div>
                            </span>
                        }

                    </div>
                )}
            </Field>
        </>)
    });

export default AddressInput