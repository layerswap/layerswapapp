import { useEffect } from "react"
import { Custom404 } from "@layerswap/widget"

export default function Custom404Page() {

    useEffect(() => {
        plausible("404", { props: { path: document.location.pathname } })
    }, [])

    return (
        <Custom404 />
    )
}