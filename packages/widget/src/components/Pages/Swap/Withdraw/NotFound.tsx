import { FC, useCallback, useEffect } from "react";
import { useIntercom } from "react-use-intercom";
import { Home } from "lucide-react";
import { useBackClickCallback } from "@/context/callbackProvider";
import MessageComponent from "@/components/Common/MessageComponent";
import NotFoundIcon from "@/components/Icons/NotFoundIcon";
import { log } from "@/context/LogProvider";

const NotFound: FC<{ swapId?: string | undefined }> = ({ swapId }) => {

    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ customAttributes: { swapId: swapId } })
    const triggerBackClickCallback = useBackClickCallback()

    useEffect(() => {
        log({
            type: "NotFound",
            props: {
                severity: "error",
                path: typeof window !== "undefined" ? window.location.pathname : undefined,
            },
        });
    }, []);

    const startIntercom = useCallback(() => {
        boot();
        show();
        updateWithProps()
    }, [boot, show, updateWithProps])

    return <MessageComponent>
        <MessageComponent.Content center>
            <MessageComponent.Header className="mb-3">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
                    <NotFoundIcon />
                </div>
                <h1 className="text-center text-2xl font-semibold text-primary-text">
                    Swap not found
                </h1>
            </MessageComponent.Header>
            <MessageComponent.Description>
                <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                    <span>We couldn&#39;t find a swap with this link. If you believe there&#39;s an issue, please</span>
                    <button
                        type="button"
                        onClick={startIntercom}
                        className="mx-1 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f1420] focus:ring-gray-400 rounded"
                    >
                        <span>contact our support</span>
                    </button>
                    <span>and we&#39;ll help you fix it.</span>
                </p>
            </MessageComponent.Description>
        </MessageComponent.Content>
        <MessageComponent.Buttons>
            <div className="flex w-full text-primary-text text-base space-x-2">
                <button
                    onClick={triggerBackClickCallback}
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-300 px-5 py-4 text-base font-semibold leading-6 hover:bg-secondary-400 focus:outline-none transition"
                >
                    <Home className="h-5 w-5" aria-hidden="true" />
                    <span>Back to app</span>
                </button>
            </div>
        </MessageComponent.Buttons>
    </MessageComponent>
}

export default NotFound