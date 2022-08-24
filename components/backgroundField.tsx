import { FC } from "react";
import CopyButton from "./buttons/copyButton";

type Props = {
    isCopiable?: boolean;
    toCopy?: string | number;
    header: string;
    children: JSX.Element | JSX.Element[];
}

const BackgroundField: FC<Props> = (({ isCopiable, toCopy, header, children }) => {
    return (
        <div className='w-full'>
            <p className="block font-normal text-sm">
                {header}
            </p>
            <div className="flex items-center justify-between rounded-md px-3 py-3 shadow-sm border border-darkblue-100  bg-darkblue-600 w-full font-semibold mt-1">
                {children}
                {
                    isCopiable &&
                    <CopyButton iconHeight={17} iconWidth={17} toCopy={toCopy} className='p-1 bg-darkblue-50 rounded'/>
                }
            </div>
        </div>
    )
})

export default BackgroundField;