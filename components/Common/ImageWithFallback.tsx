import Image, { ImageProps } from "next/image";
import { useRouter } from "next/router";
import React, { forwardRef, useEffect, useState } from "react";

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>(({ src, ...props }, ref) => {
    const router = useRouter();
    const fallbackImage = `${router?.basePath || window?.location?.origin}/_next/image?url=%2Fimages%2Flogo_placeholder.png&w=96&q=75&dpl=dpl_F5qCEJtwT2ipBr2zVii46hGUTTff'`;

    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src])

    const handleError = () => {
        setImgSrc(fallbackImage)
    }

    const isFallback = imgSrc === fallbackImage;

    return <Image
        {...props}
        alt={props.alt || 'ImageWithFallback'}
        ref={ref}
        src={fallbackImage}
        onError={handleError}
        blurDataURL={fallbackImage}
        unoptimized={isFallback}
    />;
});