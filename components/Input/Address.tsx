import { useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { AddressBookItem, SwapType, UserExchangesData } from "../../lib/layerSwapApiClient";
import NetworkSettings from "../../lib/NetworkSettings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'
import { toast } from "react-hot-toast";
import SpinIcon from "../icons/spinIcon";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import { LinkIcon, XIcon } from "@heroicons/react/outline";
import { motion } from "framer-motion";
import KnownInternalNames from "../../lib/knownIds";
import { useAuthState } from "../../context/authContext";
import ExchangeSettings from "../../lib/ExchangeSettings";
import { useSettingsState } from "../../context/settings";
import { isValidAddress } from "../../lib/addressValidator";
import { RadioGroup } from "@headlessui/react";
import Image from 'next/image';
import { Partner } from "../../Models/Partner";
import AvatarGroup from "../AvatarGroup";
import SubmitButton from "../buttons/submitButton";
import RainbowKit from "../Wizard/Steps/Wallet/RainbowKit";
import { useAccount } from "wagmi";
import { disconnect } from '@wagmi/core'
import { metaMaskWallet, rainbowWallet, imTokenWallet, argentWallet, walletConnectWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';
import { ModalFooter } from "../modalComponent";
import shortenAddress from "../utils/ShortenAddress";
import { isBlacklistedAddress } from "../../lib/mainStepValidator";
import HighlightedValue from "../highlightedValue";
import ListTable from "../listTable";

const wallets = [metaMaskWallet, rainbowWallet, imTokenWallet, argentWallet, walletConnectWallet, coinbaseWallet]

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
    hideLabel?: boolean;
    disabled: boolean;
    name: string;
    children?: JSX.Element | JSX.Element[];
    ref?: any;
    loading: boolean;
    onSetExchangeDepoisteAddress?: () => Promise<void>;
    exchangeAccount?: UserExchangesData;
    close: () => void,
    isPartnerWallet: boolean,
    partnerImage: string,
    partner: Partner,
    canFocus?: boolean,
    address_book: AddressBookItem[]
}


const Address: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ exchangeAccount, name, canFocus, onSetExchangeDepoisteAddress, loading, close, address_book, disabled, isPartnerWallet, partnerImage, partner }, ref) => {

        const {
            values,
            setFieldValue
        } = useFormikContext<SwapFormValues>();

        const inputReference = useRef(null);

        const valid_addresses = address_book?.filter(a => values.swapType === SwapType.OffRamp ? a.exchanges?.some(e => values.to.baseObject.internal_name) : isValidAddress(a.address, values.to.baseObject))
            ?.sort((a) => a.networks.some(n => n.toLowerCase() === values.to?.baseObject?.internal_name?.toLowerCase()) ? -1 : 1)

        const { setDepositeAddressIsfromAccount, setAddressConfirmed } = useSwapDataUpdate()
        const { depositeAddressIsfromAccount, addressConfirmed } = useSwapDataState()
        const placeholder = NetworkSettings.KnownSettings[values?.to?.baseObject?.internal_name]?.AddressPlaceholder ?? "0x123...ab56c"
        const [inputFocused, setInputFocused] = useState(false)
        const [inputValue, setInputValue] = useState(values?.destination_address || "")
        const [errorMesage, setErrorMessage] = useState('')

        const { authData } = useAuthState()
        const settings = useSettingsState()
        const resource_storage_url = settings.discovery.resource_storage_url
        const { address, status, isConnected, isConnecting, isDisconnected, connector } = useAccount({
            onConnect({ address, connector, isReconnected }) {
                setInputValue(address)
                setAddressConfirmed(true)
                setFieldValue("destination_address", address)
            },
            onDisconnect() {
                setInputValue("")
                setAddressConfirmed(false)
                setFieldValue("destination_address", "")
            }
        });

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

        useEffect(() => {
            if (canFocus) {
                inputReference.current.focus()
            }
        }, [canFocus])

        useEffect(() => {
            setInputValue(values.destination_address)
        }, [values.destination_address])

        const handleRemoveDepositeAddress = useCallback(async () => {
            if (depositeAddressIsfromAccount || isConnected) {
                setDepositeAddressIsfromAccount(false)
                setFieldValue("destination_address", '')
                disconnect()
            }
            setInputValue("")
        }, [depositeAddressIsfromAccount, isConnected, connector, isDisconnected])

        const handleSelectAddress = useCallback((value: string) => {
            setAddressConfirmed(true)
            setFieldValue("destination_address", value)
            close()
        }, [close])

        const inputAddressIsValid = isValidAddress(inputValue, values.to.baseObject)
        const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
            setErrorMessage('')
            setInputValue(e.target.value)
            setAddressConfirmed(false)
            if (inputValue && values.swapType !== SwapType.OffRamp && isBlacklistedAddress(settings.blacklisted_addresses, values.to.baseObject, e.target.value)) {
                setErrorMessage(`You can not transfer to this address`);
            } else if (e.target.value && !isValidAddress(e.target.value, values.to.baseObject)) {
                setErrorMessage(`Enter a valid ${values.to.name} address`);
            }
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

        const handleWaletConnect = (address: string) => {
            setAddressConfirmed(true)
            setFieldValue("destination_address", address)
            setInputValue(address)
        }

        const autofillEnabled = !inputFocused && !inputAddressIsValid
        const chains: number[] = []
        values.swapType !== SwapType.OffRamp
        [NetworkSettings.KnownSettings[values.to?.baseObject?.internal_name]?.ChainId]

        if (values.swapType === SwapType.OffRamp) {
            const availableNetworks = values.to?.baseObject?.currencies?.filter(c => c.asset === values.currency.baseObject.asset && settings.networks.find(n => n.internal_name === c.network).status === 'active')
            availableNetworks.forEach(c => {
                if (c.network) {
                    const chainId = NetworkSettings.KnownSettings[c.network]?.ChainId
                    chains.push(chainId)
                }
            })
        }
        else {
            const networkChainId = [NetworkSettings.KnownSettings[values.to?.baseObject?.internal_name]?.ChainId]
            if (networkChainId)
                chains.push(NetworkSettings.KnownSettings[values.to?.baseObject?.internal_name]?.ChainId)
        }

        const list = [
            <span>Go to the Deposits page</span>,
            <span>
                Select
                <HighlightedValue value={values.currency} />
                as asset/currency
            </span>,
            <span>Select {values.to.baseObject.display_name} as network</span>
        ]

        return (<div className='w-full flex flex-col justify-between h-full space-y-5 text-primary-text'>
            <div className='flex flex-col self-center grow w-full'>
                <div className={`flex flex-col self-center grow w-full mb-16 sm:mb-0`}>
                    <div className="text-left mb-10">
                        <label htmlFor={name}>Address</label>
                        {isPartnerWallet && partner && <span className='truncate text-sm text-indigo-200'> ({partner?.display_name})</span>}
                        <div className="flex flex-wrap flex-col md:flex-row">
                            <motion.div initial="rest" animate={autofillEnabled ? "rest" : "inputFocused"} className="relative flex grow rounded-lg shadow-sm mt-1.5 bg-darkblue-700 border-darkblue-500 border focus-within:ring-0 focus-within:ring-primary focus-within:border-primary">
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
                                    disabled={disabled || isConnected}
                                    name={name}
                                    id={name}
                                    ref={inputReference}
                                    tabIndex={0}
                                    className={`${isPartnerWallet ? 'pl-11' : ''} disabled:cursor-not-allowed grow h-12 border-none leading-4  block font-semibold w-full bg-darkblue-700 rounded-lg placeholder-primary-text truncate hover:overflow-x-scroll focus:ring-0 focus:outline-none`}
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
                                    inputValue &&
                                    <span className="inline-flex items-center mr-2">
                                        <div className="text-xs flex items-center space-x-2 md:ml-5 bg-darkblue-400 rounded-md border border-darkblue-400">
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
                                                    {/* <Image
                                                        alt={chain.name ?? 'Chain icon'}
                                                        src={chain.iconUrl}
                                                        style={{ width: 12, height: 12 }}
                                                    /> */}
                                                    <XIcon className="h-5 w-5" />
                                                </div>
                                            </button>
                                        </div>
                                    </span>
                                }
                            </motion.div>
                            <div className="basis-full leading-6 text-sm h-4 ">
                                {errorMesage && errorMesage}
                            </div>
                            {
                                <div className="mx-auto w-full rounded-lg font-normal mt-4 basis-full">
                                    <div className='flex justify-between mb-4 md:mb-8 space-x-4'>
                                        <RainbowKit chainIds={chains} >
                                            <div className="ml-auto disabled:border-primary-900 rounded-md bg-primary px-5 py-2 text-md font-semibold leading-7 text-white">
                                                Connect Wallet
                                            </div>
                                        </RainbowKit>
                                    </div>
                                </div>
                            }
                            {
                                values.swapType === SwapType.OffRamp &&
                                <ListTable header={`How to find your ${values.to.baseObject.display_name} deposit address`} list={list} />
                            }
                        </div>
                    </div>
                    {valid_addresses?.length > 0 ?
                        <div className="text-left space-y-2">
                            <label className="">Your recent addresses</label>
                            <div>
                                <RadioGroup disabled={disabled} value={values.destination_address} onChange={handleSelectAddress}>
                                    <div className="rounded-md overflow-y-auto styled-scroll">
                                        {valid_addresses?.map((a, index) => (
                                            <RadioGroup.Option
                                                key={a.address}
                                                value={a.address}
                                                disabled={disabled}
                                                className={({ checked, disabled }) =>
                                                    classNames(
                                                        disabled ? ' cursor-not-allowed ' : ' cursor-pointer ',
                                                        'relative flex focus:outline-none mt-2 mb-3  '
                                                    )
                                                }
                                            >
                                                {({ active, checked }) => {
                                                    const difference_in_days = Math.round(Math.abs(((new Date()).getTime() - new Date(a.date).getTime()) / (1000 * 3600 * 24)))
                                                    return (
                                                        <RadioGroup.Description
                                                            as="span"
                                                            className={`flex text-sm justify-between rounded-md items-center w-full transform hover:-translate-y-0.5 transition duration-200 px-2 py-1.5 border border-darkblue-900 hover:border-darkblue-500 hover:bg-darkblue-700/70 hover:shadow-xl ${checked && 'border-darkblue-700'}`}
                                                        >
                                                            <div className="flex flex-col">
                                                                <div className="block text-sm font-medium">
                                                                    {shortenAddress(a.address)}
                                                                </div>
                                                                <div className="text-gray-500">
                                                                    {
                                                                        difference_in_days === 0 ?
                                                                            <>Used today</>
                                                                            :
                                                                            (difference_in_days > 1 ?
                                                                                <>Used {difference_in_days} days ago</>
                                                                                : <>Used yesterday</>)
                                                                    }
                                                                </div>
                                                            </div>
                                                            <motion.div whileTap={{ scale: 1.05 }} className='flex text-primary-text flex-row items-center bg-darkblue-400 px-2 py-1 rounded-md space-x-1'>
                                                                <span>Transfered to</span>
                                                                <AvatarGroup imageUrls={values.swapType === SwapType.OffRamp ? a.exchanges?.map(address_excange => GetIcon({ internal_name: address_excange, resource_storage_url }))
                                                                    : a.networks?.map(address_network => GetIcon({ internal_name: address_network, resource_storage_url }))} />
                                                            </motion.div>
                                                        </RadioGroup.Description>
                                                    )
                                                }}
                                            </RadioGroup.Option>
                                        ))}
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                        :
                        <div className="text-center space-y-3">
                            <label className="mb-10">No recent swaps</label>
                            <p className="text-sm text-gray-500">Your addresses will be shown here</p>
                        </div>
                    }
                    <ModalFooter>
                        <SubmitButton type="button" isDisabled={!inputAddressIsValid} isSubmitting={false} onClick={handleSetNewAddress} >
                            Confirm
                        </SubmitButton>
                    </ModalFooter>
                </div>
            </div>
        </div >)
    });

function GetIcon({ internal_name, resource_storage_url }) {
    return `${resource_storage_url}/layerswap/networks/${internal_name.toLowerCase()}.png`;
}

export default Address