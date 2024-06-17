import { Dispatch, FC, SetStateAction } from "react"
import Modal from "../../modal/modal"
import { ExternalLink, TriangleAlert } from "lucide-react"
import SubmitButton from "../../buttons/submitButton"
import CopyButton from "../../buttons/copyButton"
import Link from "next/link"
import AddressIcon from "../../AddressIcon"
import SecondaryButton from "../../buttons/secondaryButton"
import { useFormikContext } from "formik"
import { SwapFormValues } from "../../DTOs/SwapFormValues"


type AddressNoteModalProps = {
    openModal: boolean,
    setOpenModal: Dispatch<SetStateAction<boolean>>
    onConfirm: () => void
}

const AddressNoteModal: FC<AddressNoteModalProps> = ({ openModal, setOpenModal, onConfirm }) => {

    const {
        values,
        submitForm
    } = useFormikContext<SwapFormValues>();
    const {
        to: destination,
        destination_address
    } = values

    const confirm = () => {
        setOpenModal(false)
        submitForm()
        onConfirm()
    }

    const close = () => {
        setOpenModal(false)
    }

    return (
        destination && destination_address &&
        <Modal height="fit" show={openModal} setShow={setOpenModal} modalId={"addressNote"}>
            <div className="flex flex-col items-center gap-6 mt-2">
                <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-xl p-2 bg-orange-500/20">
                    <TriangleAlert className="h-16 w-16 text-orange-500" aria-hidden="true" />
                </div>
                <div className="text-center max-w-xs space-y-1">
                    <p className="text-2xl">Address Confirmation</p>
                    <p className="text-secondary-text">
                        <span>Deposit address was autofilled from web, please make sure it is the right address.</span>
                    </p>
                </div>

                <div className="w-full rounded-lg bg-secondary-700 overflow-hidden px-4 py-3 space-y-2">
                    <div className="gap-4 flex relative items-center outline-none w-full text-primary-text">
                        <div className="flex items-center justify-between w-full">
                            <div className="text-secondary-text">
                                <span>{destination?.display_name}</span> <span>address</span>
                            </div>
                            <div className="flex items-center gap-4 text-secondary-text">
                                <CopyButton toCopy={destination_address} />
                                <Link href={destination?.account_explorer_template?.replace('{0}', destination_address) || ''} target="_blank">
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className='flex gap-3 text-sm items-center'>
                        <div className='flex flex-shrink-0 bg-secondary-400 text-primary-text items-center justify-center rounded-md h-9 overflow-hidden w-9'>
                            <AddressIcon className="scale-150 h-9 w-9" address={destination_address} size={36} />
                        </div>
                        <p className="break-all text-sm">
                            {destination_address}
                        </p>
                    </div>
                </div>
                <div className="h-full w-full space-y-3">
                    <SubmitButton type="button" onClick={confirm} isDisabled={false} isSubmitting={false}>
                        Confirm address
                    </SubmitButton>
                    <SecondaryButton className="w-full h-full py-3 !text-base" onClick={close}>
                        Change address
                    </SecondaryButton>
                </div>
            </div>
        </Modal>
    )
}

export default AddressNoteModal