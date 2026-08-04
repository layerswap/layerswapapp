import { createContext, type CSSProperties, type ReactNode, type RefObject, useContext, useMemo, } from "react"

export type UiKitThemeColor = {
    DEFAULT: string
    100: string
    200: string
    300: string
    400: string
    500: string
    600: string
    700: string
    800: string
    900: string
    text: string
}

export type UiKitTheme = {
    primary?: UiKitThemeColor
    secondary?: UiKitThemeColor
    tertiary?: string
    buttonTextColor?: string
    enablePortal?: boolean
}

type WalletUiContextValue = {
    brandMark?: ReactNode
    rootRef: RefObject<HTMLDivElement | null>
    theme?: UiKitTheme | null
}

const WalletUiContext = createContext<WalletUiContextValue | null>(null)

const variables = (name: "primary" | "secondary", color: UiKitThemeColor | undefined) => {
    if (!color) return {}
    return Object.fromEntries(Object.entries(color).map(([key, value]) => [
        `--ls-colors-${name}${key === "DEFAULT" ? "" : `-${key}`}`,
        value,
    ]))
}

export function uiKitThemeStyle(theme: UiKitTheme | null | undefined): CSSProperties {
    return {
        ...variables("primary", theme?.primary),
        ...variables("secondary", theme?.secondary),
        ...(theme?.tertiary ? { "--ls-colors-text-tertiary": theme.tertiary } : {}),
        ...(theme?.buttonTextColor ? { "--ls-colors-buttonTextColor": theme.buttonTextColor } : {}),
        height: "100%",
    } as CSSProperties
}

export function WalletUiProvider({
    children,
    brandMark,
    rootRef,
    theme,
}: {
    children: ReactNode
    brandMark?: ReactNode
    rootRef: RefObject<HTMLDivElement | null>
    theme?: UiKitTheme | null
}) {
    const value = useMemo(() => ({ brandMark, rootRef, theme }), [brandMark, rootRef, theme])
    return <WalletUiContext.Provider value={value}>{children}</WalletUiContext.Provider>
}

export function useWalletUi() {
    const context = useContext(WalletUiContext)
    if (!context) throw new Error("useWalletUi must be used within WalletUiProvider")
    return context
}

export function useOptionalWalletUi() {
    return useContext(WalletUiContext)
}

export function BrandMark() {
    const { brandMark } = useWalletUi()
    return <>{brandMark}</>
}
