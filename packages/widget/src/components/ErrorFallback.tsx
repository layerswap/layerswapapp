import { Home, RefreshCcw } from "lucide-react";
import React from "react";
import SubmitButton from "./Buttons/submitButton"
import MessageComponent from "./Common/MessageComponent"
import Navbar from "./Common/navbar"
import GoHomeButton from "./utils/GoHome"
import { IsExtensionError } from "../helpers/errorHelper";
import { useAuthState } from "../context/authContext";
import { useIntercom } from "react-use-intercom";

export default function ErrorFallback({ error, resetErrorBoundary }) {

    const extension_error = IsExtensionError(error)
    const { email, userId } = useAuthState()
    const { boot, show, update } = useIntercom()
    const updateWithProps = () => update({ userId, customAttributes: { email: email, } })

    return (
        <div className="styled-scroll">
            <main className="styled-scroll">
                <div className="min-h-screen overflow-hidden relative font-robo">
                    <Navbar />
                    <div className="mx-auto max-w-xl bg-secondary-900 shadow-card rounded-lg w-full overflow-hidden relative px-0 md:px-8 py-6 h-[500px] min-h-[550px]">
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

                                        <span
                                            onClick={() => {
                                                boot();
                                                show();
                                                updateWithProps()
                                            }}
                                            className="underline cursor-pointer text-primary"
                                        >
                                            contact our support team.
                                        </span>
                                    </p>
                                </MessageComponent.Description>
                            </MessageComponent.Content>
                            <MessageComponent.Buttons>
                                <div className="flex flex-row text-primary-text text-xs sm:text-base space-x-2">
                                    <div className='basis-1/3'>
                                        {
                                            <GoHomeButton>
                                                <SubmitButton text_align="left" buttonStyle="outline" isDisabled={false} isSubmitting={false} icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                                    Go home
                                                </SubmitButton>
                                            </GoHomeButton>
                                        }
                                    </div>
                                    <div className='basis-2/3'>
                                        <SubmitButton button_align="right" text_align="left" isDisabled={false} isSubmitting={false}
                                            onClick={() =>
                                                resetErrorBoundary()
                                            }
                                            icon={<RefreshCcw className="h-5 w-5" aria-hidden="true" />}>
                                            Try Again
                                        </SubmitButton>
                                    </div>
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

