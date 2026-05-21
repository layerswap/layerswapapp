import { useEffect, type ReactNode } from "react"
import { ImtblPassportConfig } from "./index"
import { imtblPassportService } from "./service/ImtblPassportService"

/**
 * @deprecated Prefer `imtblPassportService.initialize(config)` for non-React entry points.
 */
export const initilizePassport = async (configs: ImtblPassportConfig | undefined): Promise<void> => {
    await imtblPassportService.initialize(configs)
}

type ImtblPassportProviderWrapperProps = {
    children: ReactNode
    imtblPassportConfig?: ImtblPassportConfig
}

export function ImtblPassportProviderWrapper({ children, imtblPassportConfig }: ImtblPassportProviderWrapperProps) {
    useEffect(() => {
        imtblPassportService.setConfig(imtblPassportConfig)
        imtblPassportService.ensureEvmConnected().catch(() => { /* swallow */ })
    }, [imtblPassportConfig])

    return <>{children}</>
}

export const ImtblRedirect = ({ imtblPassportConfig }: { imtblPassportConfig?: ImtblPassportConfig }) => {
    useEffect(() => {
        imtblPassportService.setConfig(imtblPassportConfig)
        imtblPassportService.loginCallback().catch(() => { /* swallow */ })
    }, [imtblPassportConfig])

    return (
        <div>
            <h1>Redirecting...</h1>
        </div>
    )
}
