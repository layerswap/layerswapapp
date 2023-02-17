import { Field, useFormikContext } from "formik";
import { ChangeEvent, ChangeEventHandler, FC, forwardRef, useCallback, useEffect, useState } from "react";
import LayerSwapApiClient, { AddressBookItem, SwapType, UserExchangesData } from "../../lib/layerSwapApiClient";
import NetworkSettings from "../../lib/NetworkSettings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'
import { toast } from "react-hot-toast";
import SpinIcon from "../icons/spinIcon";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import { ArrowRightIcon, ExclamationIcon, LinkIcon, XIcon } from "@heroicons/react/outline";
import { motion } from "framer-motion";
import KnownInternalNames from "../../lib/knownIds";
import { useAuthState } from "../../context/authContext";
import ExchangeSettings from "../../lib/ExchangeSettings";
import ClickTooltip from "../Tooltips/ClickTooltip";
import { useSettingsState } from "../../context/settings";
import SubmitButton from "../buttons/submitButton";
import useSWR from "swr";
import { ApiResponse } from "../../Models/ApiResponse";
import { isValidAddress } from "../../lib/addressValidator";
import { RadioGroup } from "@headlessui/react";
import ToggleButton from "../buttons/toggleButton";

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
    hideLabel?: boolean;
    disabled: boolean;
    name: string;
    className?: string;
    children?: JSX.Element | JSX.Element[];
    ref?: any;
    loading: boolean;
    onSetExchangeDepoisteAddress?: () => Promise<void>;
    exchangeAccount?: UserExchangesData;
    close: () => void
}

const Address: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ exchangeAccount, hideLabel, disabled, name, className, onSetExchangeDepoisteAddress, loading, close }, ref) => {

        const layerswapApiClient = new LayerSwapApiClient()
        const address_book_endpoint = `/address_book/recent`
        const { data: address_book, mutate, isValidating } = useSWR<ApiResponse<AddressBookItem[]>>(address_book_endpoint, layerswapApiClient.fetcher)

        const {
            values,
            setFieldValue
        } = useFormikContext<SwapFormValues>();

        const valid_addresses = address_book?.data?.filter(a => isValidAddress(a.address, values.from.baseObject))

        const { setDepositeAddressIsfromAccount, setAddressConfirmed } = useSwapDataUpdate()
        const { depositeAddressIsfromAccount, addressConfirmed } = useSwapDataState()
        const placeholder = NetworkSettings.KnownSettings[values?.to?.baseObject?.internal_name]?.AddressPlaceholder ?? "0x123...ab56c"
        const [inpuFocused, setInputFocused] = useState(false)
        const [inputValue, setInputValue] = useState(values?.destination_address || "")

        const { authData } = useAuthState()
        const settings = useSettingsState()

        const exchangeCurrency = values?.swapType === SwapType.OffRamp && values.to?.baseObject?.currencies.find(ec => ec.asset === values.currency?.baseObject?.asset && ec.is_default)
        const networkDisplayName = settings?.networks?.find(n => n.internal_name === exchangeCurrency?.network)?.display_name

        const handleUseDepositeAddress = async () => {
            try {
                await onSetExchangeDepoisteAddress()
            }
            catch (e) {
                toast(e.message)
            }
        }

        const handleRemoveDepositeAddress = async () => {
            setFieldValue("destination_address", '')
            setDepositeAddressIsfromAccount(false)
        }

        const handleSelectAddress = (value: string) => {
            setFieldValue("destination_address", value)
            close()
        }

        const inputAddressisValid = isValidAddress(inputValue, values.to.baseObject)
        const destinationAddressisNew = !valid_addresses?.some(a => a.address === inputValue)
        const canSetAddress = inputAddressisValid && (addressConfirmed || !destinationAddressisNew)
        const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.target.value)
            setAddressConfirmed(false)
        }, [])

        const handleSetNewAddress = useCallback(() => {
            setFieldValue("destination_address", inputValue)
            close()
        }, [inputValue])
        const handleInputFocus = () => {
            setInputFocused(true)
        }
        const handleInputBlur = () => {
            setInputFocused(false)
        }
        return (<div className='w-full flex flex-col justify-between h-full space-y-5 text-primary-text'>
            <div className='flex flex-col self-center grow w-full'>
                <div className='flex flex-col self-center grow w-full space-y-8'>
                    <div className="text-left">
                        <label className="mb-10">{destinationAddressisNew ? 'New address' : 'Destination address'}</label>
                        <div className="flex space-x-4">
                            <motion.div initial="rest" animate={inpuFocused ? "inputFocused" : "rest"} className="flex grow rounded-lg shadow-sm mt-1.5 bg-darkblue-700 border-darkblue-500 border">
                                <motion.input
                                    onChange={handleInputChange}
                                    value={inputValue}
                                    placeholder={placeholder}
                                    onFocus={handleInputFocus}
                                    onBlur={handleInputBlur}
                                    autoCorrect="off"
                                    type={"text"}
                                    name={name}
                                    id={name}
                                    className={classNames('disabled:cursor-not-allowed grow h-12 border-none leading-4 focus:ring-primary focus:border-primary block font-semibold w-full bg-darkblue-700 rounded-lg placeholder-primary-text truncate focus-peer:ring-primary focus-peer:border-darkblue-500 focus-peer:border focus-peer:ring-1 focus:outline-none',
                                        className
                                    )}
                                    transition={{
                                        width: { ease: 'linear', }
                                    }}
                                    variants={
                                        {
                                            rest: { width: '100%' },
                                            inputFocused: {
                                                width: '100%',
                                                transition: {
                                                    when: "afterChildren",
                                                }
                                            }
                                        }
                                    }
                                />
                                {
                                    values?.swapType === SwapType.OffRamp && authData?.access_token && values.to && ExchangeSettings.KnownSettings[values.to.baseObject.internal_name]?.EnableDepositAddressConnect && !depositeAddressIsfromAccount &&
                                    <motion.span className="inline-flex items-center mr-2 shrink"
                                        transition={{
                                            width: { ease: 'linear' }
                                        }}>
                                        <motion.div className="text-xs flex items-center space-x-2 ml-3 md:ml-5">
                                            <motion.button
                                                type="button"
                                                className="p-1.5 duration-200 transition bg-darkblue-400 hover:bg-darkblue-300 rounded-md border border-darkblue-400 hover:border-darkblue-100"
                                                onClick={handleUseDepositeAddress}
                                            >
                                                <motion.div className="flex items-center" >
                                                    {
                                                        loading ? <SpinIcon className="animate-spin h-4 w-4" />
                                                            : <LinkIcon className="h-4 w-4" />
                                                    }
                                                    <motion.span className={classNames(inpuFocused ? '' : 'ml-3', "block truncate text-clip")}
                                                        variants={
                                                            {
                                                                inputFocused: {
                                                                    width: '0',
                                                                }
                                                            }
                                                        }>
                                                        Autofill from {values?.to?.baseObject?.display_name}
                                                    </motion.span>
                                                </motion.div>
                                            </motion.button>
                                        </motion.div>
                                    </motion.span>
                                }
                                {
                                    values?.swapType === SwapType.OffRamp && depositeAddressIsfromAccount &&
                                    <span className="inline-flex items-center mr-2">
                                        <div className="text-xs flex items-center space-x-2 ml-3 md:ml-5 bg-darkblue-400 rounded-md border border-darkblue-400">
                                            {
                                                values?.to?.baseObject?.internal_name?.toLowerCase() === KnownInternalNames.Exchanges.Coinbase &&
                                                <span className="inline-flex items-center mr-2">
                                                    <div className="text-sm flex items-center space-x-2 ml-3 md:ml-5">
                                                        {exchangeAccount?.note}
                                                    </div>
                                                </span>
                                            }
                                            <button
                                                type="button"
                                                className="p-0.5 duration-200 transition  hover:bg-darkblue-300  rounded-md border border-darkblue-400 hover:border-darkblue-100"
                                                onClick={handleRemoveDepositeAddress}

                                            >
                                                <div className="flex items-center" >
                                                    <XIcon className="h-5 w-5" />
                                                </div>
                                            </button>
                                        </div>
                                    </span>
                                }

                            </motion.div>
                            <button type="button" disabled={!canSetAddress} onClick={handleSetNewAddress} className={
                                classNames(
                                    canSetAddress ? ' border-primary text-primary' : 'border-darkblue-400',
                                    "flex items-center shadow-sm mt-1.5 bg-darkblue-700  border p-4 rounded-lg"
                                )}>
                                <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                        {
                            destinationAddressisNew &&
                            <div className="mx-auto w-full rounded-lg font-normal mt-5">
                                <div className='flex justify-end mb-4 md:mb-8 space-x-4'>
                                    <div className='flex items-center text-xs md:text-sm font-medium'>
                                        <ExclamationIcon className='h-6 w-6 mr-2' />
                                        I am the owner of this address
                                    </div>
                                    <div className='flex items-center space-x-4'>
                                        <ToggleButton name={"asd"} onChange={setAddressConfirmed} value={addressConfirmed} />
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                    {valid_addresses?.length > 0 &&
                        <div className="text-left space-y-3">
                            <label className="mb-10">Your recent addresses</label>
                            <div>
                                <RadioGroup value={values.destination_address} onChange={handleSelectAddress}>
                                    <RadioGroup.Label className="sr-only"> Privacy setting </RadioGroup.Label>
                                    <div className="rounded-md space-y-2">
                                        {valid_addresses?.map((a, index) => (
                                            <RadioGroup.Option
                                                key={a.address}
                                                value={a.address}
                                                className={({ checked }) =>
                                                    classNames(
                                                        checked ? ' border-primary z-10' : 'border-darkblue-400',
                                                        'relative border p-4 flex cursor-pointer focus:outline-none rounded-md rounded-tr-md'
                                                    )
                                                }
                                            >
                                                {({ active, checked }) => {
                                                    const difference_in_days = Math.round(Math.abs(((new Date()).getTime() - new Date(a.date).getTime()) / (1000 * 3600 * 24)))
                                                    return (
                                                        <>
                                                            <span className="flex flex-col w-full truncate">
                                                                <RadioGroup.Label
                                                                    as="span"
                                                                    className={'block text-sm font-medium '}
                                                                >
                                                                    {a.address}
                                                                </RadioGroup.Label>
                                                                <RadioGroup.Description
                                                                    as="span"
                                                                    className='block text-sm text-gray-500'
                                                                >
                                                                    {
                                                                        difference_in_days === 0 ?
                                                                            <>Last used today</>
                                                                            :
                                                                            (difference_in_days > 1 ?
                                                                                <>Last used {difference_in_days} days ago</>
                                                                                : <>Last used yesterday</>)
                                                                    }
                                                                </RadioGroup.Description>
                                                            </span>
                                                        </>
                                                    )
                                                }}
                                            </RadioGroup.Option>
                                        ))}
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                    }
                </div>
            </div>
        </div>)
    });

export default Address