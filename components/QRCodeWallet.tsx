import { FC, useState } from "react"
import QRCode from "qrcode.react";
import { classNames } from "./utils/classNames";
import { QrCode } from "lucide-react";
import SubmitButton from "./buttons/submitButton";
import shortenAddress from "./utils/ShortenAddress";
import CopyButton from "./buttons/copyButton";
import colors from "tailwindcss/colors";
import tailwindConfig from "./../tailwind.config";
import Modal from "./modal/modal";

type QRCodeModalProps = {
    qrUrl: string;
    className?: string
    iconHeight?: number
    iconWidth?: number
    iconClassName?: string
}

const QRCodeModal: FC<QRCodeModalProps> = ({ qrUrl, className, iconHeight, iconWidth, iconClassName }) => {
    const qrCode = (
        <QRCode
            className="p-4 bg-white rounded-lg"
            value={qrUrl}
            size={250}
            bgColor={colors.white}
            fgColor={tailwindConfig.theme.extend.colors.darkblue.DEFAULT}
            level={"H"}
        />
    );
    const [isOpen, setIsOpen] = useState(false)

    const handleOpenModal = () => setIsOpen(true)
    const handleCloseModal = () => setIsOpen(false)

    return (
        <>
            <div className={classNames(className)} onClick={handleOpenModal}>
                <div className="flex items-center gap-1 cursor-pointer">
                    <QrCode className={iconClassName} width={iconWidth ? iconWidth : 16} height={iconHeight ? iconHeight : 16} />
                </div>
            </div>
            <Modal show={isOpen} setShow={setIsOpen}  >
                <div className="flex flex-col justify-between items-center space-y-6 md:space-y-8 mt-6 md:mt-8">
                    <div>
                        {qrCode}
                    </div>
                    <div className="text-xl md:text-2xl text-primary-text">
                        <CopyButton toCopy={qrUrl} iconHeight={22} iconWidth={22}>
                            <span>{shortenAddress(qrUrl)}</span>
                        </CopyButton>
                    </div>
                    <SubmitButton onClick={handleCloseModal} isDisabled={false} isSubmitting={false}>
                        Close
                    </SubmitButton>
                </div>
            </Modal>
        </>
    )
}


export default QRCodeModal