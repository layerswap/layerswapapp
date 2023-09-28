import { Home, RefreshCcw } from "lucide-react";
import React from "react";
import SubmitButton from "./buttons/submitButton"
import ContactSupport from "./ContactSupport"
import MessageComponent from "./MessageComponent"
import Navbar from "./navbar"
import GoHomeButton from "./utils/GoHome"

export default function ErrorFallback({ error, resetErrorBoundary }) {
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
                                        Sorry, but we were unable to complete this request. We are informed, and are now investigating the issue.
                                    </p>
                                    <p>
                                        <span>Please try again. If the issue keeps happening,&nbsp;</span><span className="underline cursor-pointer text-primary "><ContactSupport>contact our support team.</ContactSupport></span>
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

