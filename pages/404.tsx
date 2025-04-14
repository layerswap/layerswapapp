import { Home } from "lucide-react"
import { useEffect } from "react"
import SubmitButton from "../components/Buttons/submitButton"
import MessageComponent from "../components/Common/MessageComponent"
import Navbar from "../components/Common/navbar"
import GoHomeButton from "../components/utils/GoHome"

export default function Custom404() {

    useEffect(() => {
        plausible("404", { props: { path: document.location.pathname } })
    }, [])

    return (
        <div className="styled-scroll">
            <main className="styled-scroll">
                <div className="min-h-screen overflow-hidden relative font-robo">
                    <Navbar />
                    <div className="mx-auto max-w-xl bg-darkblue-900 md:shadow-card rounded-lg w-full overflow-hidden relative px-6 py-6 h-[500px] min-h-[550px]">
                        <MessageComponent>
                            <MessageComponent.Content icon="red">
                                <div className="text-center">
                                    <p className="text-base font-semibold text-primary">404</p>
                                    <h1 className="mt-2 text-4xl font-bold tracking-tight text-primary-text sm:text-5xl">Page not found.</h1>
                                    <p className="mt-2 text-base text-secondary-text">Sorry, we couldn&apos;t find the page you&apos;re looking for.</p>
                                </div>
                            </MessageComponent.Content>
                            <MessageComponent.Buttons>
                                <GoHomeButton>
                                    <SubmitButton buttonStyle="outline" isDisabled={false} isSubmitting={false} icon={<Home className="h-5 w-5" />}>
                                        Go home
                                    </SubmitButton>
                                </GoHomeButton>
                            </MessageComponent.Buttons>
                        </MessageComponent>
                    </div>
                </div>
            </main>
        </div>
    )
}