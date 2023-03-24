import { useFormikContext } from "formik";
import NetworkSettings from "../../../lib/NetworkSettings";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import SlideOver from "../../SlideOver"
import shortenAddress from "../../utils/ShortenAddress";
import Image from 'next/image';
import { FC } from "react";
import { SwapType } from "../../../lib/layerSwapApiClient";
import { useQueryState } from "../../../context/query";
import { useSettingsState } from "../../../context/settings";
import { getPartner } from "../../../helpers/settingsHelper";
import AddressPicker from "./AddressPicker";

const Address = () => {

    const {
        values,
        errors, isValid, isSubmitting, setFieldValue
    } = useFormikContext<SwapFormValues>();

    const query = useQueryState();
    const settings = useSettingsState();

    const { partner, displayPartner, partnerImage } = getPartner(query, settings)

    return <SlideOver
        header={`To ${values?.to?.name || ''} address`}
        modalHeight="large"
        opener={(open => <AddressButton
            disabled={!values.to || !values.from}
            showParnerLogo={displayPartner}
            openAddressModal={open}
            partnerImage={partnerImage}
            values={values} />)}
        place='inStep'>
        {(close, animaionCompleted) => (<AddressPicker
            close={close}
            canFocus={animaionCompleted}
            onSetExchangeDepoisteAddress={handleSetExchangeDepositAddress}
            exchangeAccount={exchangeAccount}
            loading={loadingDepositAddress}
            disabled={lockAddress || (!values.to || !values.from) || loadingDepositAddress}
            name={"destination_address"}
            partnerImage={partnerImage}
            isPartnerWallet={displayPartner}
            partner={partner}
            address_book={address_book?.data}
        />)}
    </SlideOver>
}

type AddressButtonProps = {
    openAddressModal: () => void;
    showParnerLogo: boolean;
    values: SwapFormValues;
    partnerImage: string;
    disabled: boolean;
}

const AddressButton: FC<AddressButtonProps> = ({ openAddressModal, showParnerLogo, values, partnerImage, disabled }) => {
    return <button type="button" disabled={disabled} onClick={openAddressModal} className="flex rounded-lg space-x-3 items-center cursor-pointer shadow-sm mt-1.5 bg-darkblue-700 border-darkblue-500 border disabled:cursor-not-allowed h-12 leading-4 focus:ring-primary focus:border-primary font-semibold w-full placeholder-gray-400 px-3.5 py-3">
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
