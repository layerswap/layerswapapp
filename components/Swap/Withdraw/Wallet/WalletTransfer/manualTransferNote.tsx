import { useState } from "react"
import { useDepositMethod } from "../../../../../context/depositMethodContext"
import SubmitButton from "../../../../buttons/submitButton"
import ManualTransferSVG from "../../../../icons/ManualTransferSVG"
import Modal from "../../../../modal/modal"
import { ArrowUpRight } from "lucide-react"

const ManualTransferNote = () => {
    const { setShowModal: setShowDepositMethodModal, canRedirect } = useDepositMethod()
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="text-xs text-center flex gap-1 justify-center">
                <p className='text-secondary-text'>
                    Want to transfer without connecting a wallet?
                </p>
                <button onClick={() => setOpen(true)} type="button" className='text-primary-text no-underline hover:underline inline-flex'><span>See how</span> <ArrowUpRight className="h-4 w-4" /></button>
            </div>
            <Modal show={open} setShow={setOpen} height="fit" header="Transfer manually" modalId="manualTransferNote">
                <div className="mt-2 space-y-5">
                    <p className="text-sm text-secondary-text">To complete the transaction manually, switch the transfer method to “Deposit address”.</p>
                    <ManualTransferSVG />
                    <div className="space-y-3">
                        {
                            canRedirect &&
                            <SubmitButton onClick={() => {
                                setShowDepositMethodModal(true)
                                setOpen(false)
                            }} className='text-primary' isDisabled={false} isSubmitting={false}>
                                Take me there
                            </SubmitButton>
                        }
                        <button type="button" onClick={() => { setOpen(false) }} className="flex justify-center w-full">
                            <span>Close</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}

export default ManualTransferNote;