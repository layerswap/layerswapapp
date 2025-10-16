import Image, { ImageProps } from "next/image";
import React, { forwardRef, useEffect, useState } from "react";

const fallbackImage = 'https://layerswap.io/beta/images/logo_placeholder.png';

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>(({ src, ...props }, ref) => {
    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src])

    const handleErrpr = () => {
        setImgSrc(fallbackImage)
    }

    return <Image
        {...props}
        alt={props.alt || 'ImageWithFallback'}
        ref={ref}
        src={fallbackImage}
        onError={handleErrpr}
        blurDataURL={fallbackImage}
    />;
});