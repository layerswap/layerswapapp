import { useState } from "react"
import { useDepositMethod } from "../../../../../context/depositMethodContext"
import SubmitButton from "../../../../buttons/submitButton"
import ManualTransferSVG from "../../../../icons/ManualTransferSVG"
import Modal from "../../../../modal/modal"

const ManualTransferNote = () => {
    const { setShowModal: setShowDepositMethodModal, canRedirect } = useDepositMethod()
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="text-xs text-center">
                <div className='text-secondary-text mt-2'>
                    Don’t have a wallet? or want to swap manually?
                </div>
                <div className='text-secondary-text'>
                    <button onClick={() => setOpen(true)} type="button" className='text-primary'>Click here</button><span>, to see how</span>
                </div>
            </div>
            <Modal show={open} setShow={setOpen} height="fit" header="Swap manually" modalId="manualTransferNote">
                <div className="mt-5 space-y-5">
                    <p className="text-sm text-primary-buttonTextColor">To complete the swap manually you should switch the transfer method to deposit address</p>
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