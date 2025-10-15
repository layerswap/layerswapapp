import Image, { ImageProps } from "next/image";
import React, { forwardRef, useEffect, useState } from "react";
import { useRouter } from "next/router";

const fallbackImage = "https://layerswap.io/beta/_next/image?url=%2Fimages%2Flogo_placeholder.png&w=96&q=75&dpl=dpl_F5qCEJtwT2ipBr2zVii46hGUTTff";

function withBasePath(path: string, basePath: string) {
  return `${basePath || (window && window?.location?.origin)}${path.startsWith("/") ? path : `/${path}`}`;
}

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageProps>(
  ({ src, alt = "ImageWithFallback", ...props }, ref) => {
    const router = useRouter();
    const [imgSrc, setImgSrc] = useState<ImageProps["src"]>(src);

    useEffect(() => {
      setImgSrc(src);
    }, [src]);

    const handleError = () => {
      setImgSrc(withBasePath(fallbackImage, router.basePath));
    };

    return (
      <Image
        {...props}
        alt={alt}
        ref={ref}
        src={withBasePath(fallbackImage, router.basePath)}
        onError={handleError}
        blurDataURL={withBasePath(fallbackImage, router.basePath)}
      />
    );
  }
);
