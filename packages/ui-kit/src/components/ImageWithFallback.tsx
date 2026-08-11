"use client"
import React, { forwardRef, useCallback, useEffect, useState } from "react"
import { normalizeIconSrc } from "@layerswap/wallet-core"
import LogoPlaceholder from "./LogoPlaceholder"

const toImageSrc = (src: React.ImgHTMLAttributes<HTMLImageElement>["src"]) =>
    typeof src === "string" ? normalizeIconSrc(src) : src

export const ImageWithFallback = forwardRef<HTMLImageElement, React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>>(({ src, ...props }, ref) => {
    const [imgSrc, setImgSrc] = useState(() => toImageSrc(src))
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        setImgSrc(toImageSrc(src))
        setHasError(false)
    }, [src])

    const handleError = useCallback(() => {
        setHasError(true)
    }, [setHasError])

    if (hasError) {
        return <LogoPlaceholder {...props} />
    }

    return <img
        {...props}
        alt={props.alt || "ImageWithFallback"}
        ref={ref}
        src={imgSrc}
        onError={handleError}
    />
})
