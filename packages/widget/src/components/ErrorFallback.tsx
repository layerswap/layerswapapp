import { useCallback, useEffect } from "react";
import { useIntercom } from "react-use-intercom";
import { Home, RotateCcw } from "lucide-react";
import { useLog } from "@/context/LogProvider";
import MessageComponent from "./Common/MessageComponent";
import NotFoundIcon from "./Icons/NotFoundIcon";
import SubmitButton from "./Buttons/submitButton";
import { FallbackProps } from "react-error-boundary";

export default function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {

    const { boot, show } = useIntercom()
    const { log } = useLog();

    useEffect(() => {
        log({
            type: "ErrorFallback",
            props: {
                name: error?.name,
                message: error?.message,
                where: "ErrorFallback",
                severity: "error",
                $exception_type: "Error Fallback",
            },
        });
    }, []);

    const startIntercom = useCallback(() => {
        boot();
        show();
    }, [boot, show])

    return (
        <div className="styled-scroll">
            <main className="styled-scroll">
                <div className="min-h-screen overflow-hidden relative font-robo">
                    <div className="mx-auto max-w-lg bg-secondary-700 shadow-card rounded-lg w-full overflow-hidden relative px-6 pt-6 pb-2 h-[500px] min-h-[550px]">
                        <MessageComponent>
                            <MessageComponent.Content center>
                                <MessageComponent.Header className="mb-3">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
                                        <NotFoundIcon />
                                    </div>
                                    <h1 className="text-center text-2xl font-semibold text-white">
                                        Unable to complete the request
                                    </h1>
                                </MessageComponent.Header>
                                <MessageComponent.Description>
                                    <p className="mx-auto text-center text-base font-normal leading-5 text-secondary-text px-9">
                                        <span>Our team is informed and are now investigating the issue. Please try again, if the issue persists you can</span>
                                        <button
                                            type="button"
                                            onClick={startIntercom}
                                            className="mx-1 underline decoration-gray-400 underline-offset-2 hover:decoration-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f1420] focus:ring-gray-400 rounded"
                                        >
                                            <span>contact our support.</span>
                                        </button>
                                    </p>
                                </MessageComponent.Description>
                            </MessageComponent.Content>
                            <MessageComponent.Buttons>
                                <div className="flex flex-col w-full text-primary-text text-base space-y-2">
                                    <SubmitButton style={{ display: 'ruby' }} className="py-3 text-center " button_align="right" text_align="left" isDisabled={false} isSubmitting={false}
                                        onClick={() =>
                                            resetErrorBoundary()
                                        } icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}>
                                        <span>Try Again</span>
                                    </SubmitButton>
                                    <button
                                        onClick={resetErrorBoundary}
                                        type="button"
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-300 px-5 py-3 text-base font-semibold leading-6 hover:bg-secondary-400 focus:outline-none transition"
                                    >
                                        <Home className="h-5 w-5" aria-hidden="true" />
                                        <span>Back to app</span>
                                    </button>
                                </div>
                            </MessageComponent.Buttons>
                        </MessageComponent>
                    </div>
                    <div id="widget_root" />
                </div>
            </main>
        </div>
    );
}