import { FC, createContext, useContext, useEffect, useRef, useState } from "react";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import { StripeOnramp, loadStripeOnramp } from "@stripe/crypto";
import { useFormWizardaUpdate } from "../../../context/formWizardProvider";
import { SwapWithdrawalStep } from "../../../Models/Wizard";
import { PublishedSwapTransactionStatus } from "../../../lib/layerSwapApiClient";

const FiatTransfer: FC = () => {
    const { swap } = useSwapDataState()
    const stripeSessionId = swap?.metadata?.['STRIPE:SessionId']
    const stripeOnrampPromise = loadStripeOnramp(process.env.NEXT_PUBLIC_STRIPE_SECRET);

    return <div className='rounded-md bg-secondary-700 border border-secondary-500 divide-y divide-secondary-500'>
        <CryptoElements stripeOnramp={stripeOnrampPromise}>
            <OnrampElement clientSecret={stripeSessionId} swapId={swap?.id}/>
        </CryptoElements>
    </div>
}

const CryptoElementsContext = createContext(null);

export const CryptoElements: FC<{ stripeOnramp: Promise<StripeOnramp> }> = ({
    stripeOnramp,
    children
}) => {
    const [ctx, setContext] = useState<{ onramp: StripeOnramp }>(() => ({ onramp: null }));
    useEffect(() => {
        let isMounted = true;

        Promise.resolve(stripeOnramp).then((onramp) => {
            if (onramp && isMounted) {
                setContext((ctx) => (ctx.onramp ? ctx : { onramp }));
            }
        });

        return () => {
            isMounted = false;
        };
    }, [stripeOnramp]);

    return (
        <CryptoElementsContext.Provider value={ctx}>
            {children}
        </CryptoElementsContext.Provider>
    );
};

// React hook to get StripeOnramp from context
export const useStripeOnramp = () => {
    const context = useContext<{ onramp: StripeOnramp }>(CryptoElementsContext);
    return context?.onramp;
};
type OnrampElementProps = {
    clientSecret: string,
    swapId: string,
}
// React element to render Onramp UI
export const OnrampElement:FC<OnrampElementProps> = ({
    clientSecret,
    swapId,
    ...props
}) => {
    const stripeOnramp = useStripeOnramp();
    const onrampElementRef = useRef(null);
    const { goToStep } = useFormWizardaUpdate<SwapWithdrawalStep>()
    const { mutateSwap, setSwapPublishedTx } = useSwapDataUpdate()

    useEffect(() => {
        const containerRef = onrampElementRef.current;
        if (containerRef) {
            containerRef.innerHTML = '';

            if (clientSecret && stripeOnramp && swapId) {
                const session = stripeOnramp
                    .createSession({
                        clientSecret,
                        appearance: {
                            theme: "dark"
                        },
                    })
                    .mount(containerRef)
                const eventListener = async (e) => {
                    let transactionStatus: PublishedSwapTransactionStatus
                    if (e.payload.session.status === "fulfillment_complete")
                        transactionStatus = PublishedSwapTransactionStatus.Completed
                    else if (e.payload.session.status === "fulfillment_processing")
                        transactionStatus = PublishedSwapTransactionStatus.Pending
                    else {
                        // TODO handle
                        return
                    }
                    await setSwapPublishedTx(swapId, PublishedSwapTransactionStatus.Completed, e.payload.session.id);
                    goToStep(SwapWithdrawalStep.SwapProcessing)
                }
                session.addEventListener("onramp_session_updated", eventListener)
            }
        }

    }, [clientSecret, stripeOnramp, swapId]);

    return <div {...props} ref={onrampElementRef}></div>;
};

export default FiatTransfer