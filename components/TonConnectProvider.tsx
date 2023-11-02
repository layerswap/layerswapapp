import { THEME, TonConnectUIProvider } from "@tonconnect/ui-react"

const TonConnectProvider = ({ children, basePath }: { children: JSX.Element | JSX.Element[], basePath: string }) => {

    return (
        <TonConnectUIProvider uiPreferences={
            {
                theme: THEME.DARK,
                borderRadius: 's',
                // colorsSet: {
                //     [THEME.DARK]: {
                //         constant: {
                //             black: '#000000',
                //             white: '#f1f1f1f1',
                //         },
                //         connectButton: {
                //             background:'rgb(var(--ls-colors-primary-500))',
                //             foreground: 'rgb(var(--ls-colors-secondary-800))',
                //         },
                //         accent: 'rgb(var(--ls-colors-primary-500))',
                //         telegramButton: 'rgb(var(--ls-colors-primary-500))',
                //         icon: {
                //             primary: 'rgb(var(--ls-colors-primary-500))',
                //             secondary:'rgb(var(--ls-colors-secondary-text))',
                //             tertiary: 'rgb(var(--ls-colors-secondary-200))',
                //             success: Color$1,
                //             error: Color$1,
                //         },
                //         background: {
                //             primary: 'rgb(var(--ls-colors-secondary-900))',
                //             secondary: 'rgb(var(--ls-colors-secondary-800))',
                //             segment: 'rgb(var(--ls-colors-secondary-200))',
                //             tint: 'rgb(var(--ls-colors-secondary-700))',
                //             qr: 'rgb(var(--ls-colors-primary-text))',
                //         },
                //         text: {
                //             primary: 'rgb(var(--ls-colors-primary-text))',
                //             secondary: 'rgb(var(--ls-colors-secondary-text))',
                //         }
                //     }
                // }
            }
        } manifestUrl={`https://${process.env.NEXT_PUBLIC_VERCEL_URL}${basePath ? `/${basePath}` : ''}/tonconnect-manifest.json`}>
            {children}
        </TonConnectUIProvider>
    )
}

export default TonConnectProvider