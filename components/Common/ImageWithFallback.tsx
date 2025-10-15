import Image, { ImageProps } from "next/image";
import React, { forwardRef, useEffect, useState } from "react";

const fallbackImage = 'https://layerswap.io/beta/_next/image?url=%2Fimages%2Flogo_placeholder.png&w=96&q=75&dpl=dpl_F5qCEJtwT2ipBr2zVii46hGUTTff';

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