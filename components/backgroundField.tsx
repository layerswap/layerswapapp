import { FC } from "react";
import CopyButton from "./buttons/copyButton";
import QRCodeModal from "./QRCodeWallet";

type Props = {
    isCopiable?: boolean;
    isQRable?: boolean;
    toCopy?: string | number;
    header: string;
    children: JSX.Element | JSX.Element[];
}

const BackgroundField: FC<Props> = (({ isCopiable, toCopy, header, children, isQRable }) => {
    return (
        <div className='w-full'>
            <p className="block font-normal text-sm">
                {header}
            </p>
            <div className="flex items-center justify-between rounded-md px-3 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                {children}
                <div className="space-x-2 flex">
                    {
                        isQRable &&
                        <QRCodeModal qrUrl={toCopy?.toLocaleString()} iconHeight={17} iconWidth={17} className='p-1 bg-darkblue-50 rounded' />
                    }
                    {
                        isCopiable &&
                        <CopyButton iconHeight={17} iconWidth={17} toCopy={toCopy} className='p-1 bg-darkblue-50 rounded' />
                    }
                </div >
            </div>
        </div>
    )
})

export default BackgroundField;