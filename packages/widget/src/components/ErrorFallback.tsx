import { RefreshCcw } from "lucide-react";
import React, { FC } from "react";
import SubmitButton from "./Buttons/submitButton"
import MessageComponent from "./Common/MessageComponent"
import { IsExtensionError } from "../helpers/errorHelper";
import { useIntercom } from "react-use-intercom"

const ContactSupport: FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { boot, show, update } = useIntercom()

    return <span onClick={() => {
        boot();
        show();
        update()
    }}>
        {children}
    </span>
}

export default function ErrorFallback({ error, resetErrorBoundary }) {

    const extension_error = IsExtensionError(error)

    return (
        <div className="styled-scroll">
            <div className="overflow-hidden relative font-robo">
                <div className="mx-auto max-w-xl bg-secondary-700 shadow-card rounded-lg w-full overflow-hidden relative px-0 md:px-8 py-6 h-[500px] min-h-[550px]">
                    <MessageComponent>
                        <MessageComponent.Content icon="red">
                            <MessageComponent.Header>
                                Unable to complete the request
                            </MessageComponent.Header>
                            <MessageComponent.Description>
                                <p>
                                    <span>Sorry, but we were unable to complete this request.&nbsp;</span>
                                    {
                                        extension_error ?
                                            <span>It seems that some of your extensions are preventing the app from running.</span>
                                            : <span>We are informed, and are now investigating the issue.</span>
                                    }

                                </p>
                                <p>
                                    {
                                        extension_error ?
                                            <span>Please disable extensions and try again or open in incognito mode. If the issue keeps happening,&nbsp;</span>
                                            :
                                            <span>Please try again. If the issue keeps happening,&nbsp;</span>
                                    }

                                    <span className="underline cursor-pointer text-primary "><ContactSupport>contact our support team.</ContactSupport></span>
                                </p>
                            </MessageComponent.Description>
                        </MessageComponent.Content>
                        <MessageComponent.Buttons>
                            <div className="flex flex-row text-primary-text text-xs sm:text-base space-x-2">
                                <SubmitButton button_align="right" text_align="left" isDisabled={false} isSubmitting={false}
                                    onClick={() =>
                                        resetErrorBoundary()
                                    }
                                    icon={<RefreshCcw className="h-5 w-5" aria-hidden="true" />}>
                                    Try Again
                                </SubmitButton>
                            </div>
                        </MessageComponent.Buttons>
                    </MessageComponent>
                </div>
                <div id="widget_root" />
            </div>
        </div>
    );
}

