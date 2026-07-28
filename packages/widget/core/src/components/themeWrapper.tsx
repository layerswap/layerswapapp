import type { JSX } from 'react';

type Props = {
    children: JSX.Element | JSX.Element[]
}
export default function ThemeWrapper({ children }: Props) {
    return <main className="styled-scroll h-full">
        <div className={`flex flex-col items-center overflow-hidden relative font-robo h-full`}>
            <div className="w-full h-full sm:max-w-[472px] z-auto">
                <div className="flex h-full w-full content-center items-center justify-center flex-col">
                    <div className="h-full w-full text-primary-text">
                        {children}
                    </div>
                </div>
            </div>
            <div id="offset-for-stickyness" className="block md:hidden"></div>
        </div>
    </main>
}