import { useState } from "react"
import { useDepositMethod } from "@/context/depositMethodContext"
import SubmitButton from "@/components/buttons/submitButton"
import ManualTransferSVG from "@/components/icons/ManualTransferSVG"
import VaulDrawer from "@/components/modal/vaulModal"
import SecondaryButton from "@/components/buttons/secondaryButton"

const ManualTransferNote = () => {
    const { redirect, canRedirect } = useDepositMethod()
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="text-xs text-center flex flex-col md:flex-row gap-1 justify-center items-center -mt-1">
                <p className='text-secondary-text'>
                    Want to transfer without connecting a wallet?
                </p>
                <button onClick={() => setOpen(true)} type="button" className='text-secondary-text underline hover:no-underline inline-flex'><span>See how</span></button>
            </div>
            <VaulDrawer show={open} setShow={setOpen} header="Transfer manually" modalId="manualTransferNote">
                <VaulDrawer.Snap id="item-1">
                    <div className="space-y-5">
                        <p className="text-sm text-secondary-text">To complete the transaction manually, switch the transfer method to “Deposit address”.</p>
                        <div className="overflow-hidden w-fit mx-auto">
                            <ManualTransferSVG className="w-[350px] h-auto" />
                        </div>
                        <div className="space-y-3">
                            {
                                canRedirect &&
                                <SubmitButton onClick={() => {
                                    redirect(true)
                                    setOpen(false)
                                }} className='text-primary' isDisabled={false} isSubmitting={false}>
                                    Take me there
                                </SubmitButton>
                            }
                            <SecondaryButton type="button" size="xl" onClick={() => { setOpen(false) }} className="flex justify-center w-full py-3">
                                <span>Close</span>
                            </SecondaryButton>
                        </div>
                    </div>
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    )
}

export default ManualTransferNote;