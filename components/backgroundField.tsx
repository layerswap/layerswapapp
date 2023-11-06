import { FC } from "react";
import CopyButton from "./buttons/copyButton";
import QRCodeModal from "./QRCodeWallet";
import useWindowDimensions from "../hooks/useWindowDimensions";
import ExploreButton from "./buttons/exploreButton";

type Props = {
    Copiable?: boolean;
    QRable?: boolean;
    Explorable?: boolean;
    toCopy?: string | number;
    toExplore?: string;
    header?: JSX.Element | JSX.Element[] | string;
    highlited?: boolean,
    withoutBorder?: boolean,
    children: JSX.Element | JSX.Element[];
}

const BackgroundField: FC<Props> = (({ Copiable, toCopy, header, children, QRable, highlited, withoutBorder, Explorable, toExplore }) => {
    const { isMobile } = useWindowDimensions()

    return (
        <div className="relative w-full">
            {
                highlited &&
                <div className="absolute -inset-2">
                    <div className="animate-pulse w-full h-full mx-auto rotate-180 opacity-30 blur-lg filter" style={{ background: 'linear-gradient(90deg, #E42575 -0.55%, #A6335E 22.86%, #E42575 48.36%, #ED6EA3 73.33%, #E42575 99.34%)' }}></div>
                </div>
            }
            <div className={`w-full relative px-3 py-3 shadow-sm ${withoutBorder ? 'border-secondary-700' : 'border-secondary-500 rounded-md border bg-secondary-700'}`}>
                {
                    header && <p className="block font-semibold text-sm text-secondary-text">
                        {header}
                    </p>
                }
                <div className="flex items-center justify-between w-full mt-1 space-x-2">
                    {children}
                    <div className="space-x-2 flex self-start">
                        {
                            QRable && toCopy &&
                            <QRCodeModal qrUrl={toCopy?.toLocaleString()} iconSize={isMobile ? 20 : 16} className=' text-secondary-text bg-secondary-text/10 p-1.5 hover:text-primary-text rounded' />
                        }
                        {
                            Copiable && toCopy &&
                            <CopyButton iconSize={isMobile ? 20 : 16} toCopy={toCopy} className=' text-secondary-text bg-secondary-text/10 p-1.5 hover:text-primary-text rounded' />
                        }
                        {
                            Explorable && toExplore &&
                            <ExploreButton href={toExplore} target="_blank" iconSize={isMobile ? 20 : 16} className=' text-secondary-text bg-secondary-text/10 p-1.5 hover:text-primary-text rounded' />
                        }
                    </div>
                </div>
            </div>
        </div>
    )
})

export default BackgroundField;