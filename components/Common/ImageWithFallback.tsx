import Image, { ImageProps } from "next/image";
import React, { forwardRef, useEffect, useState } from "react";

import fallbackPng from "@/public/images/logo_placeholder.png"; 

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>(({ src, ...props }, ref) => {
    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src])

    const handleErrpr = () => {
        setImgSrc(fallbackPng)
    }

    return <Image
        {...props}
        alt={props.alt || 'ImageWithFallback'}
        ref={ref}
        src={imgSrc}
        onError={handleErrpr}
        blurDataURL={'/images/logo_placeholder.png'}
    />;
});