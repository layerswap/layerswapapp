import { FC } from "react";
import { useFormikContext } from "formik";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { SwapFormValues } from "../Pages/Swap/Form/SwapFormValues";

type Props = {
    direction: "from" | "to",
}

const TransferCEX: FC<Props> = ({ direction }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();

    const { from, to, fromExchange, toExchange } = values
    const exchangeNetwork = (direction === 'from' ? from : to)

    const sourceLogo = fromExchange ? fromExchange.logo : from?.logo
    const destinationLogo = toExchange ? toExchange.logo : to?.logo

    const learnMoreUrl = fromExchange ? 'https://learn.layerswap.io/user-docs/layerswap-app/transfer-from-cex/' : 'https://learn.layerswap.io/user-docs/layerswap-app/transfer-to-cex/'

    return (<div className="font-normal flex flex-col w-full relative z-10 my-3 pb-4 border-b-2 border-b-secondary">
        <div className="w-full px-2.5 space-y-2">
            <div className="flex items-center mb-">
                <p className="text-primary-text-tertiary text-base leading-5">
                    <span>Please select an intermediary network available on </span>
                    <span>{fromExchange ? fromExchange.display_name : toExchange?.display_name}&nbsp;</span>
                    <span>to be used for </span>
                    <span>{fromExchange ? 'withdrawal' : 'deposit'}</span><span>.</span>
                    <a target='_blank' href={learnMoreUrl} className='text-primary-text-tertiary underline hover:no-underline decoration-primary-text-tertiary ml-1 cursor-pointer'>Learn more</a>
                </p>
            </div>
            <div className="relative flex items-center space-x-2 py-2">
                <div className="shrink-0 h-6 w-6 relative">
                    {sourceLogo && <ImageWithFallback
                        src={sourceLogo!}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain"
                    />}
                </div>
                <div className="w-full h-[2px] bg-primary-text-tertiary my-2 line line-left" />
                <div className="shrink-0 h-8 w-8 relative">
                    {exchangeNetwork ? <ImageWithFallback
                        src={exchangeNetwork.logo}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain"
                    /> : <div className="mainImage flex justify-center items-center bg-secondary-400 h-full w-full rounded-md">
                        <span className="font-bold text-primary-text-tertiary text-xl">?</span>
                    </div>}
                </div>
                <div className="w-full h-[2px] bg-primary-text-tertiary my-2 line line-right" />
                <div className="shrink-0 h-6 w-6 relative">
                    {destinationLogo && <ImageWithFallback
                        src={destinationLogo!}
                        alt="Project Logo"
                        height="40"
                        width="40"
                        loading="eager"
                        className="rounded-md object-contain"
                    />}
                </div>
            </div>
        </div>
    </div>
    );
}

export default TransferCEX;
