import { Field, useFormikContext } from "formik";
import { FC, forwardRef, useState } from "react";
import { SwapType, UserExchangesData } from "../../lib/layerSwapApiClient";
import NetworkSettings from "../../lib/NetworkSettings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'
import { toast } from "react-hot-toast";
import SpinIcon from "../icons/spinIcon";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import { Link, X } from "lucide-react";
import { motion } from "framer-motion";
import KnownInternalNames from "../../lib/knownIds";
import { useAuthState } from "../../context/authContext";
import ExchangeSettings from "../../lib/ExchangeSettings";
import ClickTooltip from "../Tooltips/ClickTooltip";
import { useSettingsState } from "../../context/settings";

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
}

const AddressInput: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ exchangeAccount, hideLabel, disabled, name, className, onSetExchangeDepoisteAddress, loading }, ref) => {

        const {
            values,
            setFieldValue
        } = useFormikContext<SwapFormValues>();

        const { setDepositeAddressIsfromAccount } = useSwapDataUpdate()
        const { depositeAddressIsfromAccount } = useSwapDataState()
        const placeholder = NetworkSettings.KnownSettings[values?.to?.baseObject?.internal_name]?.AddressPlaceholder ?? "0x123...ab56c"
        const [inpuFocused, setInputFocused] = useState(false)
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

        const handleInputFocus = () => {
            setInputFocused(true)
        }
        const handleInputBlur = () => {
            setInputFocused(false)
        }

        return (<>
            {
                !hideLabel &&
                <label htmlFor={name} className="flex font-normal text-primary-text text-sm">
                    To {values?.to?.name || ''}{exchangeCurrency && values.swapType === SwapType.OffRamp && <span className="font-semibold mx-1">{networkDisplayName}</span>} address
                    {exchangeCurrency && values.swapType === SwapType.OffRamp &&
                        <span className="inline-block ">
                            <ClickTooltip text={`The deposit address of ${values.currency.name} in ${networkDisplayName} network/chain at ${values.to?.baseObject?.display_name}`}/>
                        </span>}
                </label>
            }
            <Field name={name}>
                {({ field }) => (
                    <motion.div initial="rest" animate={inpuFocused ? "inputFocused" : "rest"} className="flex rounded-lg shadow-sm mt-1.5 bg-darkblue-700 border-darkblue-500 border">
                        <motion.input
                            {...field}
                            value={field.value || ""}
                            ref={ref}
                            placeholder={placeholder}
                            autoCorrect="off"
                            type={"text"}
                            name={name}
                            id={name}
                            disabled={disabled}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
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
                                        className="p-1.5 duration-200 transition bg-darkblue-500 hover:bg-darkblue-400 rounded-md border border-darkblue-500 hover:border-darkblue-200"
                                        onClick={handleUseDepositeAddress}
                                    >
                                        <motion.div className="flex items-center" >
                                            {
                                                loading ? <SpinIcon className="animate-spin h-4 w-4" />
                                                    : <Link className="h-4 w-4" />
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
                                <div className="text-xs flex items-center space-x-2 ml-3 md:ml-5 bg-darkblue-500 rounded-md border border-darkblue-500">
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
                                        className="p-0.5 duration-200 transition  hover:bg-darkblue-400  rounded-md border border-darkblue-500 hover:border-darkblue-200"
                                        onClick={handleRemoveDepositeAddress}

                                    >
                                        <div className="flex items-center" >
                                            <X className="h-5 w-5" />
                                        </div>
                                    </button>
                                </div>
                            </span>
                        }
                    </motion.div>
                )}
            </Field>
        </>)
    });

export default AddressInput