import { FC } from "react";
import CopyButton from "./buttons/copyButton";
import QRCodeModal from "./QRCodeWallet";

type Props = {
    isCopiable?: boolean;
    isQRable?: boolean;
    toCopy?: string | number;
    header?: JSX.Element | JSX.Element[] | string;
    highlited?: boolean,
    children: JSX.Element | JSX.Element[];
}

const BackgroundField: FC<Props> = (({ isCopiable, toCopy, header, children, isQRable, highlited }) => {
    return (
        <div className="relative w-full">
            {
                highlited &&
                <div className="absolute -inset-2">
                    <div className="animate-pulse w-full h-full mx-auto rotate-180 opacity-30 blur-lg filter" style={{ background: 'linear-gradient(90deg, #E42575 -0.55%, #A6335E 22.86%, #E42575 48.36%, #ED6EA3 73.33%, #E42575 99.34%)' }}></div>
                </div>
            }
            <div className='w-full relative rounded-md px-3 py-3 shadow-sm border border-darkblue-500  bg-darkblue-700'>
                {
                    header && <p className="block font-bold text-sm text-slate-300">
                        {header}
                    </p>
                }
                <div className="flex items-center justify-between w-full mt-1 space-x-1">
                    {children}
                    <div className="space-x-2 flex self-start">
                        {
                            isQRable &&
                            <QRCodeModal qrUrl={toCopy?.toLocaleString()} iconHeight={17} iconWidth={17} className='p-1 hover:text-white rounded' />
                        }
                        {
                            isCopiable &&
                            <CopyButton iconHeight={17} iconWidth={17} toCopy={toCopy} className='p-1 hover:text-white rounded' />
                        }
                    </div>
                </div>
            </div>
        </div>
    )
})

export default BackgroundField;