import { Field, useFormikContext } from "formik";
import { ChangeEvent, ChangeEventHandler, FC, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import LayerSwapApiClient, { AddressBookItem, SwapType, UserExchangesData } from "../../lib/layerSwapApiClient";
import NetworkSettings from "../../lib/NetworkSettings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'
import { toast } from "react-hot-toast";
import SpinIcon from "../icons/spinIcon";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import { ArrowDownIcon, ArrowRightIcon, ExclamationIcon, LinkIcon, XIcon } from "@heroicons/react/outline";
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
import Image from 'next/image';
import { Partner } from "../../Models/Partner";
import AvatarGroup from "../AvatarGroup";

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
    close: () => void,
    isPartnerWallet: boolean,
    partnerImage: string,
    partner: Partner,
    canFocus: boolean,
    address_book: AddressBookItem[]
}

const Address: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ exchangeAccount, name, className, onSetExchangeDepoisteAddress, loading, close, canFocus, address_book, disabled, isPartnerWallet, partnerImage, partner }, ref) => {

        const {
            values,
            setFieldValue
        } = useFormikContext<SwapFormValues>();

        const inputReference = useRef(null);

        useEffect(() => {
            if (canFocus) {
                setTimeout(() => {
                    inputReference.current?.focus()
                }, 100);
            }
        }, [canFocus, name])

        const valid_addresses = address_book?.filter(a => isValidAddress(a.address, values.from.baseObject))
            ?.sort((a) => a.networks.some(n => n.toLowerCase() === values.to?.baseObject?.internal_name?.toLowerCase()) ? -1 : 1)

        const { setDepositeAddressIsfromAccount, setAddressConfirmed } = useSwapDataUpdate()
        const { depositeAddressIsfromAccount, addressConfirmed } = useSwapDataState()
        const placeholder = NetworkSettings.KnownSettings[values?.to?.baseObject?.internal_name]?.AddressPlaceholder ?? "0x123...ab56c"
        const [inputFocused, setInputFocused] = useState(false)
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
            setInputValue("")
            setDepositeAddressIsfromAccount(false)
        }

        const handleSelectAddress = useCallback((value: string) => {
            setAddressConfirmed(true)
            setFieldValue("destination_address", value)
            close()
        }, [close])

        const inputAddressisValid = isValidAddress(inputValue, values.to.baseObject)
        const destinationAddressisNew = !valid_addresses?.some(a => a.address === inputValue)
        const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.target.value)
            setAddressConfirmed(false)
        }, [])

        const handleInputFocus = () => {
            setInputFocused(true)
        }
        const handleInputBlur = () => {
            setInputFocused(false)
        }

        const handleSetNewAddress = useCallback(() => {
            setAddressConfirmed(true)
            setFieldValue("destination_address", inputValue)
            close()
        }, [inputValue])

        const autofillEnabled = !inputFocused && !inputAddressisValid

        return (<div className='w-full flex flex-col justify-between h-full space-y-5 text-primary-text'>
            <div className='flex flex-col self-center grow w-full'>
                <div className={`flex flex-col self-center grow w-full space-y-8`}>
                    <div className="text-left">
                        {`To ${values?.to?.name || ''} address`}
                        {isPartnerWallet && partner && <span className='truncate text-sm text-indigo-200'> ({partner?.display_name})</span>}
                        <div className="flex flex-wrap flex-col md:flex-row">
                            <motion.div initial="rest" animate={autofillEnabled ? "rest" : "inputFocused"} className="relative flex grow rounded-lg shadow-sm mt-1.5 ">
                                {isPartnerWallet &&
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {
                                            partnerImage &&
                                            <Image alt="Partner logo" className='rounded-md object-contain' src={partnerImage} width="24" height="24"></Image>
                                        }
                                    </div>
                                }
                                <motion.input
                                    onChange={handleInputChange}
                                    value={inputValue}
                                    placeholder={placeholder}
                                    onFocus={handleInputFocus}
                                    onBlur={handleInputBlur}
                                    autoCorrect="off"
                                    type={"text"}
                                    disabled={disabled}
                                    name={name}
                                    id={name}
                                    ref={inputReference}
                                    className={classNames('myinput disabled:cursor-not-allowed grow h-12 border-none leading-4 focus:ring-darkblue-100 focus:border-darkblue-100 block font-semibold w-full bg-darkblue-700 rounded-lg placeholder-primary-text truncate hover:overflow-x-scroll focus-peer:ring-primary-900 focus-peer:border focus-peer:ring-1 focus:outline-none',
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
                                    values?.swapType === SwapType.OffRamp
                                    && authData?.access_token && values.to
                                    && ExchangeSettings.KnownSettings[values.to.baseObject.internal_name]?.EnableDepositAddressConnect
                                    && !depositeAddressIsfromAccount
                                    &&
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
                                                    <motion.span className={classNames(autofillEnabled ? 'ml-3' : '', "block truncate text-clip")}
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
                            {
                                <div className="mx-auto w-full rounded-lg font-normal mt-5 basis-full">
                                    <div className='flex justify-between mb-4 md:mb-8 space-x-4'>
                                        {
                                            inputAddressisValid &&
                                            <>
                                                <label htmlFor="address_confirm" className='flex items-center text-xs md:text-sm font-medium'>
                                                    <ExclamationIcon className='h-6 w-6 mr-2' />
                                                    I am the owner of this address
                                                </label>
                                            </>
                                        }
                                        <button disabled={!inputAddressisValid} onClick={handleSetNewAddress} className="ml-auto disabled:border-primary-900 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed rounded-md bg-primary px-5 py-2 text-sm font-semibold leading-5 text-white">
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                    {valid_addresses?.length > 0 && !disabled &&
                        <div className="text-left space-y-3">
                            <label className="mb-10">Your recent addresses</label>
                            <div>
                                <RadioGroup value={values.destination_address} onChange={handleSelectAddress}>
                                    <div className="rounded-md space-y-2 overflow-y-auto styled-scroll">
                                        {valid_addresses?.map((a, index) => (
                                            <RadioGroup.Option
                                                key={a.address}
                                                value={a.address}
                                                className={({ checked }) =>
                                                    classNames(
                                                        checked ? ' border-primary-900 z-10' : 'border-darkblue-400',
                                                        'hover:border-primary-900 relative border p-4 flex cursor-pointer focus:outline-none rounded-md rounded-tr-md'
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
                                                                    className='flex text-sm text-gray-500 mt-1 justify-between'
                                                                >
                                                                    <div className="flex items-center">
                                                                        {
                                                                            difference_in_days === 0 ?
                                                                                <>Last used today</>
                                                                                :
                                                                                (difference_in_days > 1 ?
                                                                                    <>Last used {difference_in_days} days ago</>
                                                                                    : <>Last used yesterday</>)
                                                                        }
                                                                    </div>
                                                                    <motion.div whileTap={{ scale: 1.05 }} className='flex flex-row items-center bg-darkblue-400 px-2 py-1 rounded-md mt-1.5'>
                                                                        Transfered to <AvatarGroup imageUrls={a.networks?.map(address_network => `${settings.discovery.resource_storage_url}/layerswap/networks/${address_network.toLowerCase()}.png`)} />
                                                                    </motion.div>
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