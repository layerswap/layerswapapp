import { useFormikContext } from "formik";
import NetworkSettings from "../../../lib/NetworkSettings";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import SlideOver from "../../SlideOver"
import shortenAddress from "../../utils/ShortenAddress";
import Image from 'next/image';
import { FC, useCallback, useEffect, useRef, useState } from "react";
import LayerSwapApiClient, { AddressBookItem, SwapType, UserExchangesData } from "../../../lib/layerSwapApiClient";
import { useQueryState } from "../../../context/query";
import { useSettingsState } from "../../../context/settings";
import { getDepositeAddressEndpoint, getPartner } from "../../../helpers/settingsHelper";
import AddressPicker from "./AddressPicker";
import OfframpAccountConnectStep from "../../OfframpAccountConnect";
import ConnectApiKeyExchange from "../../connectApiKeyExchange";
import { useRouter } from "next/router";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import toast from "react-hot-toast";
import { KnownwErrorCode } from "../../../Models/ApiError";
import { isValidAddress } from "../../../lib/addressValidator";
import useSWR from "swr";
import { ApiResponse } from "../../../Models/ApiResponse";
import useSWRMutation from 'swr/mutation'
import { useAuthState } from "../../../context/authContext";

const Address = () => {

    const {
        values,
        errors, isValid, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();
    const [openExchangeConnect, setOpenExchangeConnect] = useState(false)
    const router = useRouter();
    const [loadingDepositAddress, setLoadingDepositAddress] = useState(false)
    const { setDepositeAddressIsfromAccount } = useSwapDataUpdate()
    const { depositeAddressIsfromAccount } = useSwapDataState()
    const [exchangeAccount, setExchangeAccount] = useState<UserExchangesData>()
    const { authData } = useAuthState()
    const layerswapApiClient = new LayerSwapApiClient()
    const address_book_endpoint = authData?.access_token ? `/address_book/recent` : null
    const { data: address_book } = useSWR<ApiResponse<AddressBookItem[]>>(
        address_book_endpoint,
        layerswapApiClient.fetcher,
        { dedupingInterval: 2 * 60 * 1000 }
    )

    const deposit_address_endpoint = getDepositeAddressEndpoint(values)
    let { data: deposit_address, trigger: getExchangeDepositAddress } = useSWRMutation<ApiResponse<string>>(
        deposit_address_endpoint,
        async (url: string) => {
            try {
                const res = await layerswapApiClient.fetcher(url)
                setFieldValue("destination_address", res.data)
                setDepositeAddressIsfromAccount(true)
                return res
            }
            catch (e) {
                toast(e?.response?.data?.error?.message || e.message)
                setFieldValue("destination_address", "")
                setDepositeAddressIsfromAccount(false)
            }
        }
    )

    const handleExchangeConnected = useCallback(async () => {
        setLoadingDepositAddress(true)
        await getExchangeDepositAddress()
        setLoadingDepositAddress(false)
    }, [])

    const query = useQueryState();
    const settings = useSettingsState();

    const { partner, displayPartner, partnerImage } = getPartner(query, settings)
    const closeExchangeConnect = (open) => {
        setLoadingDepositAddress(open)
        setOpenExchangeConnect(open)
    }

    const handleSetExchangeDepositAddress = useCallback(async () => {
        setLoadingDepositAddress(true)
        const layerswapApiClient = new LayerSwapApiClient(router)
        try {
            const exchange_account = await layerswapApiClient.GetExchangeAccount(values?.to?.baseObject.internal_name, 0)
            setExchangeAccount(exchange_account.data)
            const deposit_address = await layerswapApiClient.GetExchangeDepositAddress(values?.to?.baseObject.internal_name, values?.currency?.baseObject?.asset)
            setFieldValue("destination_address", deposit_address.data)
            setDepositeAddressIsfromAccount(true)
            setLoadingDepositAddress(false)
        }
        catch (e) {
            if (e?.response?.data?.error?.code === KnownwErrorCode.NOT_FOUND || e?.response?.data?.error?.code === KnownwErrorCode.INVALID_CREDENTIALS)
                setOpenExchangeConnect(true)
            else {
                toast(e?.response?.data?.error?.message || e.message)
                setLoadingDepositAddress(false)
            }
        }
    }, [values])


    const depositeAddressIsfromAccountRef = useRef(depositeAddressIsfromAccount);

    useEffect(() => {
        depositeAddressIsfromAccountRef.current = depositeAddressIsfromAccount
        return () => depositeAddressIsfromAccountRef.current = null
    }, [depositeAddressIsfromAccount])

    useEffect(() => {
        if (depositeAddressIsfromAccountRef.current)
            handleExchangeConnected()
        if (values.swapType !== SwapType.OffRamp && !values?.to?.baseObject?.currencies.find(c => c.asset === values?.currency?.baseObject?.asset)?.is_refuel_enabled) {
            setFieldValue('refuel', false)
        }
    }, [values.currency])

    const lockAddress =
        (values.destination_address && values.to)
        && isValidAddress(values.destination_address, values.to?.baseObject)
        && ((query.lockAddress && (query.addressSource !== "imxMarketplace" || settings.validSignatureisPresent)));

    return <>
        <label htmlFor="destination_address" className="block font-semibold text-primary-text text-sm">
            {`To ${values?.to?.name || ''} address`}
        </label>
        <SlideOver
            header={`To ${values?.to?.name || ''} address`}
            modalHeight="large"
            opener={(open => <AddressButton
                disabled={!values.to || !values.from}
                showParnerLogo={displayPartner}
                onClick={open}
                partnerImage={partnerImage}
                values={values} />)}
            place='inStep'>
            {(close, animaionCompleted) => (<AddressPicker
                close={close}
                canFocus={animaionCompleted}
                onSetExchangeDepoisteAddress={handleSetExchangeDepositAddress}
                exchangeAccount={exchangeAccount}
                loading={loadingDepositAddress}
                disabled={lockAddress || (!values.to || !values.from)}
                name={"destination_address"}
                partnerImage={partnerImage}
                displayPartner={displayPartner}
                partner={partner}
                address_book={address_book?.data}
            />)}
        </SlideOver>
        {values?.swapType === SwapType.OffRamp &&
            <SlideOver imperativeOpener={[openExchangeConnect, closeExchangeConnect]} place='inStep'>
                {(close) => (
                    (values?.to?.baseObject.authorization_flow) === "o_auth2" ?
                        <OfframpAccountConnectStep OnSuccess={async () => { await handleExchangeConnected(); close() }} />
                        : <ConnectApiKeyExchange exchange={values?.to?.baseObject} onSuccess={async () => { handleExchangeConnected(); close() }} slideOverPlace='inStep' />
                )}
            </SlideOver>}
    </>
}

type AddressButtonProps = {
    onClick: () => void;
    showParnerLogo: boolean;
    values: SwapFormValues;
    partnerImage: string;
    disabled: boolean;
}

const AddressButton: FC<AddressButtonProps> = ({ onClick, showParnerLogo, values, partnerImage, disabled }) => {
    return <button type="button" disabled={disabled} onClick={onClick} className="flex rounded-lg space-x-3 items-center cursor-pointer shadow-sm mt-1.5 bg-darkblue-700 border-darkblue-500 border disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary font-semibold w-full placeholder-gray-400 px-3.5 py-3">
        {showParnerLogo && values.swapType !== SwapType.OffRamp &&
            <div className="shrink-0 flex items-center pointer-events-none">
                {
                    partnerImage &&
                    <Image alt="Partner logo" className='rounded-md object-contain' src={partnerImage} width="24" height="24"></Image>
                }
            </div>
        }
        <div className="truncate">
            {values.destination_address ?
                <TruncatedAdrress address={values.destination_address} />
                :
                (NetworkSettings.KnownSettings[values?.to?.baseObject?.internal_name]?.AddressPlaceholder ?? "0x123...ab56c")}
        </div>
    </button>
}
const TruncatedAdrress = ({ address }: { address: string }) => {
    return <div className="tracking-wider text-white">{shortenAddress(address)}</div>
}
export default Address
